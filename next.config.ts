import type { NextConfig } from "next";

// import ReactComponentName from "react-scan/react-component-name/webpack";

const nextConfig: NextConfig = {
	/* config options here */
	// output: 'standalone',

	eslint: {
		// Warning: This allows production builds to successfully complete even if
		// your project has ESLint errors.
		ignoreDuringBuilds: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "monstro-bucket.s3.us-east-2.amazonaws.com",
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
	serverRuntimeConfig: {
		maxHeaderSize: 32 * 1024, // 32KB
	},
	skipTrailingSlashRedirect: true,
	transpilePackages: ["next-mdx-remote"],
	output: "standalone",
	// webpack: (config) => {
	//   config.plugins.push(ReactComponentName({}));
	//   return config;
	// },
};

export default nextConfig;
