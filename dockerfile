FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Install necessary tools
RUN apt-get update && apt-get install -y \
    git \
    wget \
    openjdk-11-jre \
    && rm -rf /var/lib/apt/lists/*
    # Install Allure CLI
    RUN wget -qO - https://repo.maven.apache.org/maven2/io/qameta/allure/allure-commandline/2.16.1/allure-commandline-2.16.1.tgz \
        | tar -xz -C /opt/ && \
        ln -s /opt/allure-commandline-2.16.1/bin/allure /usr/local/bin/allure

# set environment variables

# Build ARG for Personal Access Token
# ARG AZURE_PASS

# Clone the private Azure DevOps repo
ARG AZURE_REPO_URL
RUN test -n "$AZURE_REPO_URL" && git clone "$AZURE_REPO_URL" /comtrak

# Set working directory
WORKDIR /comtrak

# Install dependencies
RUN npm install


