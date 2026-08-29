FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY release/tefas-pro/ /usr/share/nginx/html/

EXPOSE 8282

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget --quiet --output-document=- http://127.0.0.1:8282/healthz || exit 1
