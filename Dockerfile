FROM nginx:alpine
COPY src/       /usr/share/nginx/html
COPY ssl/       /etc/nginx/ssl/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
