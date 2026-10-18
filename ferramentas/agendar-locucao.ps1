# Cria a tarefa automática do Windows: toda segunda, 09:00, gera a locução da semana.
# Se o computador estiver desligado nesse horário, roda assim que ligar.
$pasta = "C:\SupportStore"
$node  = (Get-Command node -ErrorAction Stop).Source
$acao  = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"cd /d $pasta && `"$node`" locucao.mjs >> log-locucao.txt 2>&1`""
$gatilho = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9:00am
$conf  = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "SupportStore Locucao Semanal" -Action $acao -Trigger $gatilho -Settings $conf -Description "Gera a locução dos Reels da Support Store toda segunda." -Force | Out-Null
Write-Host "Pronto. A locução agora é gerada sozinha toda segunda às 9h. Registro em $pasta\log-locucao.txt"
