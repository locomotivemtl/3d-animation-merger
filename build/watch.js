import browserSync from 'browser-sync';
import { compileScripts } from './build.js'

compileScripts();

// Create a new BrowserSync instance
const server = browserSync.create();

// Start the BrowserSync server
server.init({
	open: false,
	notify: false, 
	ghostMode: false,
	server: true
}, (err) => {
	console.error(err)    
});

// Watch source scripts
server.watch(
    [
        './scripts/**/*.js'
    ]
).on('change', () => {
    compileScripts();
});

server.watch(
    [
        './bin/*.js',        
        './styles/*.css',
        './*.html'
    ]
).on('change', server.reload);