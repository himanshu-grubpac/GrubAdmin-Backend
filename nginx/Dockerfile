FROM nginx:alpine

RUN mkdir -p /var/www/certbot

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
