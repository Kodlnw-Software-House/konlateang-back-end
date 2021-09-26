FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package.json ./
# RUN apk update 
# RUN apk add curl 
RUN curl --location --verbose https://github.com/lovell/sharp-libvips/releases/download/v8.10.6/libvips-8.10.6-linux-x64.tar.br
RUN npm install --verbose --unsafe-perm

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]