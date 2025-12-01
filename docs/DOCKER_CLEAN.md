Docker cleanup and rebuild (PowerShell)

WARNING: some commands remove unused images, builders and volumes. Make sure you don't need any local images or volumes before running destructive commands.

1) Restart Docker Desktop
- Open Docker Desktop UI and click Restart (recommended before heavy cleanup).

2) Prune builder cache (safe, non-destructive to images in use)
```powershell
# removes build cache
docker builder prune --all --force
# if you use buildx
docker buildx prune --all --force
```

3) Rebuild the problematic service without cache
```powershell
# Rebuild orders and payments services without cache to avoid corrupted snapshot errors
docker-compose build --no-cache --progress=plain orders_service payments_service
```

4) If you still see snapshot / parent does not exist errors, run a broader prune (destructive)
```powershell
# Shows disk usage first
docker system df

# Remove dangling images
docker image prune --all --force

# Remove unused containers, networks, images and optionally volumes
# WARNING: this will remove images not referenced by any container and may remove volumes!
docker system prune --all --volumes --force
```

5) Factory reset (last resort)
- Use Docker Desktop -> Settings -> Troubleshoot -> Reset to factory defaults.
- This removes all containers, images, volumes and settings.

6) WSL2 troubleshooting (Windows):
```powershell
# restart the WSL service (Run PowerShell as Administrator)
Restart-Service LxssManager
# then restart Docker Desktop
```

If you run any command and it fails, save the output and paste it here so I can help analyze.
