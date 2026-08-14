; =====================================================
; POS System - Windows Installer (Inno Setup 6)
; =====================================================
; Build command:
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "C:\Users\PC\Projects\pos-system\installer\POS-System.iss"
; Output:
;   C:\Users\PC\Projects\pos-system\POS-System-Setup.exe
; =====================================================

#define MyAppName "POS System"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "POS System"
#define MyAppURL "http://localhost:3000"
#define MyAppExeName "start-pos.bat"

[Setup]
AppId={{POS-SYSTEM-2026-001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName=C:\POS-System
DisableProgramGroupPage=no
DefaultGroupName={#MyAppName}
OutputDir=..
OutputBaseFilename=POS-System-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0
ShowLanguageDialog=no
DisableWelcomePage=no
CloseApplications=force
RestartApplications=no
UninstallDisplayIcon={app}\src\app\favicon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Start POS automatically with Windows"; GroupDescription: "Auto Start"; Flags: unchecked

[Dirs]
Name: "{app}"; Permissions: users-modify
Name: "{app}\backups"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify
Name: "{app}\uploads"; Permissions: users-modify
Name: "{app}\public\uploads"; Permissions: users-modify

[Files]
; Core configuration and metadata
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\next.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\prisma.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\next-env.d.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\postcss.config.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\components.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion

; Prisma schema, migrations, seed
Source: "..\prisma\schema.prisma"; DestDir: "{app}\prisma"; Flags: ignoreversion
Source: "..\prisma\seed.ts"; DestDir: "{app}\prisma"; Flags: ignoreversion
Source: "..\prisma\migrations\*"; DestDir: "{app}\prisma\migrations"; Flags: ignoreversion recursesubdirs createallsubdirs

; Application source code
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs

; Public static assets (fonts for PDF/receipt)
Source: "..\public\*"; DestDir: "{app}\public"; Excludes: "*.svg"; Flags: ignoreversion recursesubdirs createallsubdirs

; Pre-built production output (standalone mode from next.config.ts output: 'standalone')
Source: "..\.next\standalone\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "..\.next\static\*"; DestDir: "{app}\.next\static"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Installer helper scripts
Source: "..\scripts\check-mysql.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\create-db.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\check-db-empty.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\backup-db.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\restore-db.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\install-service.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\uninstall-service.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\start-pos.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\restart-pos.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\monitor-pos.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\installer-post-install.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\setup-simple.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\install-xampp.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\start-xampp-mysql.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\pos-setup-master.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "..\scripts\update-pos.bat"; DestDir: "{app}\scripts"; Flags: ignoreversion

; Convenience batch files at app root
Source: "..\setup.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\update.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dev.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\update-pos.bat"; DestDir: "{app}"; Flags: ignoreversion

; Documentation
Source: "..\INSTALL.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\scripts\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\{#MyAppName} Setup"; Filename: "{app}\scripts\setup-simple.bat"; WorkingDir: "{app}"
Name: "{group}\{#MyAppName} Website"; Filename: "{#MyAppURL}"
Name: "{group}\Restart POS"; Filename: "{app}\scripts\restart-pos.bat"; Parameters: "{app}"; WorkingDir: "{app}"
Name: "{group}\Backup Database"; Filename: "{app}\scripts\backup-db.bat"; Parameters: "{code:GetMySQLBin|{app}} pos_system root "" {app}\backups"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\scripts\{#MyAppExeName}"; Tasks: desktopicon; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName} Setup"; Filename: "{app}\scripts\setup-simple.bat"; Tasks: desktopicon; WorkingDir: "{app}"

[Run]
Filename: "{app}\scripts\pos-setup-master.bat"; Description: "Setting up POS System (XAMPP + Database + Application)"; StatusMsg: "Please wait while POS System is configured. This may take several minutes..."; Flags: waituntilterminated
Filename: "{app}\scripts\install-service.bat"; Parameters: "{app} {code:GetAutoStartFlag}"; Description: "Configure auto-start"; StatusMsg: "Configuring auto-start..."; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "{app}\scripts\uninstall-service.bat"; Parameters: "{app}"; RunOnceId: "StopPOSService"; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\.next\cache"
Type: filesandordirs; Name: "{app}\src\generated"
Type: filesandordirs; Name: "{app}\logs"
Type: files; Name: "{app}\*.log"

[Code]
function GetAutoStartFlag(Param: String): String;
begin
  if WizardIsTaskSelected('autostart') then
    Result := 'true'
  else
    Result := 'false';
end;

function GetMySQLBin(Param: String): String;
var
  ResultCode: Integer;
  OutputFile: string;
  OutputText: AnsiString;
  AppDir: string;
begin
  AppDir := ExtractFileDir(Param);
  OutputFile := ExpandConstant('{tmp}') + '\pos-mysql-bin.txt';
  if Exec(ExpandConstant('{cmd}'), '/c "' + AppDir + '\scripts\check-mysql.bat" > "' + OutputFile + '" 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0) then
  begin
    if LoadStringFromFile(OutputFile, OutputText) then
    begin
      Result := Trim(OutputText);
      Exit;
    end;
  end;
  Result := 'C:\xampp\mysql\bin\mysql.exe';
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  if not Exec(ExpandConstant('{cmd}'), '/c node --version >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    MsgBox('Node.js is not installed or not in PATH.' + #13#10 + 'Please install Node.js LTS from https://nodejs.org/ then run this installer again.', mbError, MB_OK);
    Result := false;
    Exit;
  end;

  if ResultCode <> 0 then
  begin
    MsgBox('Node.js is not installed or not in PATH.' + #13#10 + 'Please install Node.js LTS from https://nodejs.org/ then run this installer again.', mbError, MB_OK);
    Result := false;
    Exit;
  end;

  Result := true;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    if MsgBox('Keep the POS database and uploaded data?' + #13#10 + 'Click Yes to preserve all sales, products, customers, and settings (recommended).' + #13#10 + 'Click No to also remove uploaded files in the application folder.', mbConfirmation, MB_YESNO) = IDNO then
    begin
      DelTree(ExpandConstant('{app}\uploads'), True, True, True);
      DelTree(ExpandConstant('{app}\public\uploads'), True, True, True);
    end;
  end;
end;
