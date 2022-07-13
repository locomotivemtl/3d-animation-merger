import esbuild from 'esbuild';

export async function compileScripts() { 
	await esbuild.build( 
		{
		    bundle: true,
		    color: true,
		    sourcemap: true,
		    target: [
		        'es2015',
		    ],	
		    entryPoints: ['./scripts/main.js'],
		    outdir: './bin'
		}
	);
	console.log('Compiled scripts');  
}

compileScripts();