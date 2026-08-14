# POS System Installer - Build Guide

## Requirements

1. Windows 10/11 machine
2. [Inno Setup 6](https://jrsoftware.org/isinfo.php) installed
3. Node.js LTS installed
4. This project source code

## Step-by-Step Build

### 1. Install Inno Setup

Download and install from:
https://jrsoftware.org/isinfo.php

Default install path:
```
C:\Program Files (x86)\Inno Setup 6
```

### 2. Prepare Project

Make sure project is in a known location, e.g.:
```
C:\Users\%USERNAME%\Projects\pos-system
```

### 3. Build the Installer

Open Command Prompt or PowerShell **as Administrator**:

```powershell
cd C:\Users\%USERNAME%\Projects\pos-system\installer
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "POS-System.iss"
```

Or from Command Prompt:

```cmd
cd C:\Users\%USERNAME%\Projects\pos-system\installer
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" POS-System.iss
```

### 4. Output

After successful build, the installer will be created at:

```
C:\Users\%USERNAME%\Projects\pos-system\POS-System-Setup.exe
```

## Including Node.js Installer (Optional)

To bundle Node.js installer so customers don't need to download separately:

1. Download Node.js LTS MSI from https://nodejs.org/
2. Create folder: `C:\Users\%USERNAME%\Projects\pos-system\installer\redist`
3. Place MSI file in that folder, e.g. `node-v22.x-x64.msi`
4. Uncomment the redist section in `POS-System.iss`
5. Rebuild

## Testing the Installer

Test scenarios:

1. **Clean install** on Windows VM without Node.js/MySQL
2. **Install over existing** POS System (update scenario)
3. **Restart Windows** - verify POS auto-starts
4. **Kill node.exe** - verify restart via monitor task
5. **Uninstall** - verify database is preserved by default

## Distribution

The only file customers need is:

```
POS-System-Setup.exe
```

Optional: include `INSTALL.md` for manual installation instructions.
