Set WshShell = CreateObject("WScript.Shell")

' Start Ollama if not running
If Not IsProcessRunning("ollama.exe") Then
    WshShell.Run "ollama", 0, False
    WScript.Sleep 5000 ' Wait 5 seconds for Ollama to start
End If

' Start backend server
WshShell.Run "cmd /c """" & WScript.Arguments.Named("python") & """ -m uvicorn main:app --reload""", 0, False, "C:\Windows\System32;" & WScript.Arguments.Named("backend")

' Start frontend server
WshShell.Run "cmd /c """" & WScript.Arguments.Named("npm") & """ run dev""", 0, False, "C:\Windows\System32;" & WScript.Arguments.Named("frontend")

' Wait a bit for servers to start
WScript.Sleep 5000

' Open browser
WshShell.Run "http://localhost:5173", 1, False

Function IsProcessRunning(processName)
    Set objWMIService = GetObject("winmgmts:{impersonationLevel=impersonate}\\.\root\cimv2")
    Set colProcesses = objWMIService.ExecQuery("SELECT * FROM Win32_Process WHERE Name = '" & processName & "'")
    IsProcessRunning = (colProcesses.Count > 0)
End Function
