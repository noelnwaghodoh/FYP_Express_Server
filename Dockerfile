# Use an official Node.js runtime based on Debian (which perfectly supports apt-get)
FROM node:20-bullseye

# Install ghostscript & graphicsmagick natively into the Linux container for pdf2pic
RUN apt-get update && \
    apt-get install -y ghostscript graphicsmagick && \
    apt-get clean

# Set the working directory inside the container
WORKDIR /usr/src/app

# Explicitly create the temporary directory our backend relies on for pdf extraction
RUN mkdir -p /usr/src/app/tmp && chmod 777 /usr/src/app/tmp

# Copy package installation files strictly first to cache them
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the backend applicaton code
COPY . .

# Expose the default fallback port (DigitalOcean will still dynamically inject process.env.PORT)
EXPOSE 8080

# Start the Node.js application identically to how your package.json triggers it
CMD ["npm", "start"]
