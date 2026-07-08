# Tencent Cloud Docker Deployment

This deployment keeps Supabase and Qiniu in use. Tencent Cloud only runs the
application container and Nginx reverse proxy.

## 1. Prepare Server

Open Tencent Cloud security group ports:

- `22` for SSH
- `80` for HTTP
- `443` for HTTPS

Install Docker and Nginx on the server.

## 2. Pull Code

```bash
mkdir -p /www
cd /www
git clone https://github.com/tianyue19931993/talktalk.git
cd talktalk
```

## 3. Create Environment File

Create `/www/talktalk/.env.production` from the existing production variables.
Keep Supabase and Qiniu variables unchanged.

Required groups:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

QINIU_ACCESS_KEY=
QINIU_SECRET_KEY=
QINIU_DOMAIN=
QINIU_BUCKET=
QINIU_UPLOAD_HOST=

WECHAT_PAY_APPID=
WECHAT_PAY_MCHID=
WECHAT_PAY_API_V3_KEY=
WECHAT_PAY_MCH_SERIAL=
WECHAT_PAY_PRIVATE_KEY=
WECHAT_PAY_NOTIFY_URL=

DEEPSEEK_API_KEY=
```

The `VITE_` values are used during `npm run build`, so rebuild the image after
changing them.

## 4. Start App

```bash
docker compose --env-file .env.production up -d --build
docker logs -f talktalk
```

The app listens on `127.0.0.1:5173` on the host.

## 5. Configure Nginx

```nginx
server {
  listen 80;
  server_name 124.221.18.231;

  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

## 6. Update Deployment

```bash
cd /www/talktalk
bash deploy/deploy.sh
```

## 7. GitHub Actions Auto Deploy

Add these repository secrets in GitHub:

```text
TENCENT_HOST=124.221.18.231
TENCENT_USER=root
TENCENT_SSH_KEY=<private ssh key>
```

After that, every push to `main` runs `.github/workflows/deploy-tencent-cloud.yml`
and executes `bash deploy/deploy.sh` on the server.

The server must already have:

- `/www/talktalk` cloned
- `/www/talktalk/.env.production` configured
- Docker and Docker Compose running
