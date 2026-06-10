# TalkTalk 小学数学思维训练互动学习工具

精选经典题型，提供文字讲解、图片解析和互动演示。

## Tech Stack

- React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- Supabase（原生 fetch REST API）
- Vercel 部署 + Cloudflare CDN

## 项目结构

```
talk-app-new1/
├── api/                       # Vercel Serverless Functions
│   ├── lib/
│   │   ├── wechat-pay.ts      # 微信支付 API v3 核心工具
│   │   └── supabase-admin.ts  # Supabase 服务端客户端
│   └── pay/
│       ├── create-order.ts    # POST 创建微信支付订单
│       ├── notify.ts          # POST 微信支付回调通知
│       └── query.ts           # GET 查询订单状态
├── src/                       # React 前端
│   ├── components/
│   ├── pages/
│   │   ├── mobile/            # 手机端页面
│   │   └── admin/             # 管理端页面
│   ├── stores/                # 状态管理
│   ├── lib/                   # 前端工具库
│   └── types/                 # 类型定义
├── vercel.json
└── package.json
```

## Getting Started

### 前端开发
```bash
npm install
npm run dev
```

### 本地测试 API（需要安装 Vercel CLI）
```bash
npm i -g vercel
npx vercel dev
```

### 部署到生产
```bash
git push  # Vercel 自动部署
```

## 微信支付集成

### 前置条件
1. 微信商户号（企业资质）已开通
2. 已备案域名 `www.next.digit3ds.com`
3. 商户平台配置好 APIv3 密钥和证书

### 环境变量配置（Vercel Dashboard）
| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 |
| `WECHAT_PAY_APPID` | 公众号/小程序 AppID |
| `WECHAT_PAY_MCHID` | 微信商户号 |
| `WECHAT_PAY_API_V3_KEY` | APIv3 密钥（32字节） |
| `WECHAT_PAY_MCH_SERIAL` | 商户证书序列号 |
| `WECHAT_PAY_PRIVATE_KEY` | 商户 API 私钥 PEM |
| `WECHAT_PAY_NOTIFY_URL` | 回调地址 |

### 支付流程
1. 用户选择套餐 → 调 `POST /api/pay/create-order`
2. 服务端创建 Supabase 订单 + 调微信统一下单
3. 手机端 H5 跳转支付 / 电脑端扫码支付
4. 微信回调 `POST /api/pay/notify` → 更新订单 + 激活订阅
5. 前端轮询 `GET /api/pay/query` → 显示支付成功
