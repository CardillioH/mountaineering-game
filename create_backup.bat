@echo off
echo Creating backup of game folder...

set timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%

set source="D:\Рабочий стол\Учеба ИИ\Бога проект\game"
set backup="D:\Рабочий стол\Учеба ИИ\Бога проект\backup\game_%timestamp%"

if not exist "D:\Рабочий стол\Учеба ИИ\Бога проект\backup" mkdir "D:\Рабочий стол\Учеба ИИ\Бога проект\backup"

echo Copying files to %backup%
xcopy %source% %backup% /E /I /H /Y

echo Backup completed successfully!
echo Files saved to: %backup%
pause
