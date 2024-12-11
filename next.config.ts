
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	// output: 'standalone',

	eslint: {
		// Warning: This allows production builds to successfully complete even if
		// your project has ESLint errors.
		ignoreDuringBuilds: true,
	},
	sassOptions: {
		silenceDeprecations: ['legacy-js-api'],
	},
	experimental: {

	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'monstro-bucket.s3.us-east-2.amazonaws.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'mymonstroapp.com',
			}
		]
	}
};

export default nextConfig;