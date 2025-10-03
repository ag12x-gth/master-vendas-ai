import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface TestRunResult {
  timestamp: string;
  status: 'success' | 'failure' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  failures: Array<{
    test: string;
    error: string;
    file: string;
  }>;
  artifacts: {
    videos: string[];
    traces: string[];
    screenshots: string[];
    reports: string[];
  };
}

async function createTimestampedArtifactDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(process.cwd(), 'eko', 'testing', 'artifacts', 'test-runs', timestamp);
  
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.mkdir(path.join(artifactDir, 'videos'), { recursive: true });
  await fs.mkdir(path.join(artifactDir, 'traces'), { recursive: true });
  await fs.mkdir(path.join(artifactDir, 'screenshots'), { recursive: true });
  await fs.mkdir(path.join(artifactDir, 'reports'), { recursive: true });
  
  return artifactDir;
}

async function copyArtifacts(latestDir: string, timestampedDir: string): Promise<void> {
  try {
    const dirs = ['videos', 'traces', 'screenshots', 'test-results'];
    
    for (const dir of dirs) {
      const sourcePath = path.join(latestDir, dir);
      const destPath = path.join(timestampedDir, dir);
      
      try {
        await fs.access(sourcePath);
        await execAsync(`cp -r ${sourcePath} ${destPath}`);
      } catch {
        console.log(`⚠️  Directory ${dir} not found, skipping...`);
      }
    }
    
    const reportFiles = ['results.json', 'junit.xml'];
    for (const file of reportFiles) {
      const sourcePath = path.join(latestDir, file);
      const destPath = path.join(timestampedDir, 'reports', file);
      
      try {
        await fs.access(sourcePath);
        await fs.copyFile(sourcePath, destPath);
      } catch {
        console.log(`⚠️  File ${file} not found, skipping...`);
      }
    }
  } catch (error) {
    console.error('Error copying artifacts:', error);
  }
}

async function parseTestResults(artifactDir: string): Promise<TestRunResult> {
  const resultsPath = path.join(artifactDir, 'reports', 'results.json');
  const timestamp = path.basename(artifactDir);
  
  try {
    const resultsContent = await fs.readFile(resultsPath, 'utf-8');
    const results = JSON.parse(resultsContent);
    
    const summary = {
      total: results.suites?.reduce((acc: number, suite: any) => 
        acc + suite.specs?.length || 0, 0) || 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: results.stats?.duration || 0
    };
    
    const failures: Array<{ test: string; error: string; file: string }> = [];
    
    results.suites?.forEach((suite: any) => {
      suite.specs?.forEach((spec: any) => {
        spec.tests?.forEach((test: any) => {
          if (test.status === 'passed') summary.passed++;
          else if (test.status === 'failed') {
            summary.failed++;
            failures.push({
              test: spec.title,
              error: test.results?.[0]?.error?.message || 'Unknown error',
              file: suite.file
            });
          }
          else if (test.status === 'skipped') summary.skipped++;
        });
      });
    });
    
    const status = summary.failed === 0 ? 'success' : 
                   summary.passed > 0 ? 'partial' : 'failure';
    
    const artifacts = {
      videos: await getFilesInDir(path.join(artifactDir, 'videos')),
      traces: await getFilesInDir(path.join(artifactDir, 'traces')),
      screenshots: await getFilesInDir(path.join(artifactDir, 'screenshots')),
      reports: await getFilesInDir(path.join(artifactDir, 'reports'))
    };
    
    return {
      timestamp,
      status,
      summary,
      failures,
      artifacts
    };
  } catch (error) {
    console.error('Error parsing test results:', error);
    return {
      timestamp,
      status: 'failure',
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      failures: [],
      artifacts: { videos: [], traces: [], screenshots: [], reports: [] }
    };
  }
}

async function getFilesInDir(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(dirPath, entry.name));
    return files;
  } catch {
    return [];
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Iniciando EKO App Testing...\n');
  
  const timestampedDir = await createTimestampedArtifactDir();
  console.log(`📁 Artifact directory: ${timestampedDir}\n`);
  
  try {
    console.log('🧪 Executando testes Playwright...\n');
    
    const { stdout, stderr } = await execAsync(
      'npx playwright test -c eko/testing/config/playwright.config.ts',
      { 
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, FORCE_COLOR: '1' }
      }
    );
    
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
  
  console.log('\n📦 Copiando artefatos...\n');
  const latestDir = path.join(process.cwd(), 'eko', 'testing', 'artifacts', 'test-runs', 'latest');
  await copyArtifacts(latestDir, timestampedDir);
  
  console.log('📊 Analisando resultados...\n');
  const results = await parseTestResults(timestampedDir);
  
  const summaryPath = path.join(timestampedDir, 'summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 EKO TEST REPORT #1');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`⏱️  Timestamp: ${results.timestamp}`);
  console.log(`📊 Status: ${results.status.toUpperCase()}\n`);
  console.log('📈 Summary:');
  console.log(`   Total: ${results.summary.total}`);
  console.log(`   ✅ Passed: ${results.summary.passed}`);
  console.log(`   ❌ Failed: ${results.summary.failed}`);
  console.log(`   ⏭️  Skipped: ${results.summary.skipped}`);
  console.log(`   ⏱️  Duration: ${(results.summary.duration / 1000).toFixed(2)}s\n`);
  
  if (results.failures.length > 0) {
    console.log('❌ Failures:');
    results.failures.forEach((failure, idx) => {
      console.log(`\n   ${idx + 1}. ${failure.test}`);
      console.log(`      File: ${failure.file}`);
      console.log(`      Error: ${failure.error.substring(0, 200)}...`);
    });
    console.log();
  }
  
  console.log('📦 Artifacts:');
  console.log(`   Videos: ${results.artifacts.videos.length}`);
  console.log(`   Traces: ${results.artifacts.traces.length}`);
  console.log(`   Screenshots: ${results.artifacts.screenshots.length}`);
  console.log(`   Reports: ${results.artifacts.reports.length}\n`);
  
  console.log(`📄 Full report: ${path.join(timestampedDir, 'summary.json')}`);
  console.log(`🌐 HTML report: ${path.join(latestDir, 'report-html', 'index.html')}\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (results.failures.length > 0) {
    console.log('🔧 Próximos passos:');
    console.log('   1. Revisar falhas no relatório HTML');
    console.log('   2. Executar: npx tsx eko/testing/runner/analyze-and-fix.ts');
    console.log('   3. Aplicar correções sugeridas\n');
    
    process.exit(1);
  } else {
    console.log('✅ Todos os testes passaram!\n');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
