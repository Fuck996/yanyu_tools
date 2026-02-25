# 使用 Node.js 18 官方镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 复制后端 package.json
COPY backend/package*.json ./backend/

# 安装后端依赖
WORKDIR /app/backend
RUN npm install --production

# 回到根目录
WORKDIR /app

# 复制所有源码
COPY . .

# 暴露后端端口
EXPOSE 3000

# 环境变量默认值
ENV NODE_ENV=production
ENV PORT=3000

# 启动命令
CMD ["node", "backend/server.js"]
