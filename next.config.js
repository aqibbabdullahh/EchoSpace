/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push(
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.txt$/,
        use: 'raw-loader',
      }
    );
    return config;
  }
}

module.exports = nextConfig 