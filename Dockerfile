FROM alpine:3.7

RUN apk add --update nodejs

COPY package.json /src/package.json
RUN cd /src; npm install

COPY . /src

EXPOSE 3000
CMD ["node", "/src/main.js"]
