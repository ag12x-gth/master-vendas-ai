$IdentityFile = "$env:USERPROFILE\.ssh\replit"
$Port = "22"
$User = "62863c59-d08b-44f5-a414-d7529041de1a"
$HostName = "62863c59-d08b-44f5-a414-d7529041de1a.replit.dev"

Write-Host "Connecting to $User@$HostName with key $IdentityFile"
# Using -o UserKnownHostsFile=/dev/null to avoid issues
ssh -i "$IdentityFile" -p $Port -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$User@$HostName" $args
