FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package.json ./
ENV HOME = "${pwd}"
ENV NPM_CONFIG_CACHE = "${pwd}/.npm"
RUN npm config set sharp_binary_host "https://npm.taobao.org/mirrors/sharp"
RUN npm config set sharp_libvips_binary_host "https://npm.taobao.org/mirrors/sharp-libvips"
RUN npm install --verbose --unsafe-perm

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]