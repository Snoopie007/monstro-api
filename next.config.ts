import type { NextConfig } from "next";

// import ReactComponentName from "react-scan/react-component-name/webpack";

const nextConfig: NextConfig = {
	/* config options here */
	// output: 'standalone',

	// Remove eslint config - it's no longer supported in next.config.ts
	// If you need to ignore ESLint during builds, use: next build --no-lint
	// Or configure ESLint in .eslintrc.json

	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "monstro-bucket.s3.us-east-2.amazonaws.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "monstro-bucket.s3.amazonaws.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "mymonstroapp.com",
			},
			{
				protocol: "https",
				hostname: "maps.gstatic.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "api.dicebear.com",
				pathname: "/**",
			},
		],
	},
	// Remove serverRuntimeConfig - not a valid Next.js option
	// If you need server-side config, use environment variables or API routes
	skipTrailingSlashRedirect: true,
	transpilePackages: ["next-mdx-remote"],
	output: "standalone",
	// webpack: (config) => {
	//   config.plugins.push(ReactComponentName({}));
	//   return config;
	// },
};

export default nextConfig;
