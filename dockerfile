# Runtime image for Next.js standalone + git present
FROM node:20-alpine
WORKDIR /app

# Alpine 沒有預裝 git，安裝以支援 simple-git 或 CLI 操作
RUN apk add --no-cache git

# 從 CI 準備好的 context 複製執行期檔案
# （CI 會把 .next/standalone、.next/static、public 放到 docker_ctx/ 再 build）
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

ENV PORT=3000
EXPOSE 3000

# Next.js standalone 預設入口
CMD ["node", "server.js"]
