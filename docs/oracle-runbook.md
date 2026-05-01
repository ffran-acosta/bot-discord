# Oracle VM Runbook

Guia rapida para operar el bot en Oracle sin mezclar infraestructura con documentacion funcional del bot.

## Configuracion local privada

Los datos sensibles (IP real, ruta de key y alias local) estan en `docs/oracle-runbook.local.md` y ese archivo debe quedar fuera de Git.

## PM2 basico

### Dejar un solo proceso

```bash
pm2 delete all
cd ~/bot-discord
pm2 start npm --name bot-discord -- start
pm2 save
```

### Autostart al reiniciar VM

```bash
pm2 startup
```

Ejecuta el comando `sudo ...` que te devuelve PM2 y luego:

```bash
pm2 save
```

### Operacion diaria

```bash
pm2 status
pm2 logs bot-discord --lines 50
pm2 restart bot-discord
```

## Deploy rapido (sin entrar a la VM)

Desde la raiz del proyecto:

```bash
./deploy.sh
```

Si el nombre del proceso en PM2 es `bot-discord`:

```bash
DEPLOY_PROCESS=bot-discord ./deploy.sh
```

## Shortcut `botlog` (PowerShell)

```powershell
if (!(Test-Path $PROFILE)) { New-Item -Type File -Path $PROFILE -Force }
Add-Content $PROFILE @'
function botlog {
  ssh -t -i C:\path\to\your\oracle-key.key ubuntu@YOUR_ORACLE_PUBLIC_IP "pm2 logs bot-discord --lines 50"
}
'@
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
. $PROFILE
```

Uso:

```powershell
botlog
```

## Shortcut `botlog` (Git Bash)

```bash
cat >> ~/.bashrc <<'EOF'
botlog() {
  ssh -t -i ~/path/to/your/oracle-key.key ubuntu@YOUR_ORACLE_PUBLIC_IP "pm2 logs bot-discord --lines 50"
}
EOF
source ~/.bashrc
```

Uso:

```bash
botlog
```

## Alias SSH configurado

El alias `oracle-bot` esta configurado en `~/.ssh/config`.

Uso:

```bash
ssh oracle-bot
```

## Sobre SSH

- No necesitas crear un archivo `ssh` dentro del proyecto.
- Solo necesitas una clave privada (`.key`) valida en tu maquina local.
- Los shortcuts se guardan en tu perfil local (`~/.bashrc` o `$PROFILE`).
- Opcional: usa `~/.ssh/config` para alias de host.

Ejemplo:

```sshconfig
Host oracle-bot
  HostName YOUR_ORACLE_PUBLIC_IP
  User ubuntu
  IdentityFile ~/path/to/your/oracle-key.key
```

Luego:

```bash
ssh oracle-bot
```
