@echo off
set IDENTITY_FILE=%USERPROFILE%\.ssh\replit
set PORT=22
set USER=62863c59-d08b-44f5-a414-d7529041de1a
set HOST=62863c59-d08b-44f5-a414-d7529041de1a.replit.dev

ssh -i "%IDENTITY_FILE%" -p %PORT% -o StrictHostKeyChecking=no "%USER%@%HOST%" %*
