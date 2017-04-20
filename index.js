'use strict'
const gulp = require('gulp')
const plumber = require('gulp-plumber')
const changed = require('gulp-changed')
const imageMin = require('gulp-imagemin')
const rename = require('gulp-rename')
const gulpIf = require('gulp-if')
const imageResize = require('gulp-image-resize')
const merge = require('merge-stream')
const freshRequire = require('require-without-cache')
const notify = require('task-notify')
const error = require('task-error-notify')

// Process everything
module.exports = function(config, cb){
	let imgConfig = []

	function process(cb){
		try{
			imgConfig = freshRequire(`${process.cwd()}/${config.src}/${config.img}/_config.js`, require)
		}
		catch(e){
			imgConfig = []
		}
		const streams = []
		// Create a different stream for each group of images
		for(let i = imgConfig.length; i--;){
			const imgData = imgConfig[i]
			// If format is changing
			const opts = {}
			if(imgData.format){
				opts.extension = `.${imgData.format}`
			}
			imgData.imageMagick = true
			streams[i] = gulp.src(`${config.src}/${config.img}/${imgData.src}`)
				.pipe(plumber({ errorHandler: error }))
				.pipe(rename(path => {
					const arr = imgData.src.split('/')
					if(arr.length > 1){
						arr.pop()
						path.dirname = arr.join('/')
					}
				}))
				.pipe(rename(path => { console.log(path )}))
				.pipe(gulpIf(('prepend' in imgData), rename(path => {
					path.basename += imgData.prepend
					delete imgData.prepend
				})))
				.pipe(gulpIf(('prefix' in imgData), rename(path => {
					path.basename = `${imgData.prefix}${path.basename}`
					delete imgData.prefix
				})))
				.pipe(gulpIf(('append' in imgData), rename(path => {
					path.basename = `${path.basename}${imgData.append}`
					delete imgData.append
				})))
				.pipe(gulpIf(('rename' in imgData), rename(path => {
					path.basename = imgData.rename
					delete imgData.rename
				})))
				//.pipe(changed(`${config.dist}/${config.img}`, opts))
				.pipe(imageResize(imgData))
		}
		// Merge streams & minify
		if(streams.length){
			return merge(streams)
				.pipe(imageMin())
				.pipe(gulp.dest(`${config.dist}/${config.img}`))
				.on('end', () => {
					notify('Images resized & processed')
					if(typeof cb === 'function') cb()
				})
		}
		else{
			notify('Images resized & processed')
			if(typeof cb === 'function') cb()
		}
	}


	function ico(cb){
		return gulp.src(`${config.src}/**/*.ico`)
			.pipe(plumber({ errorHandler: error }))
			//.pipe(changed(`${config.dist}`))
			.pipe(gulp.dest(`${config.dist}`))
			.on('end', () => {
				notify('Icons copied')
				if(typeof cb === 'function') cb()
			})
	}


	function copy(cb){
		// Build a glob of images that were not processed
		const src = [ `${config.src}/${config.img}/**/*.{png,jpg,gif,jpeg}` ]
		for(let i = imgConfig.length; i--;){
			src.push(`!${config.src}/${config.img}/${imgConfig[i].src}`)
		}

		// Copy to img dir
		return gulp.src(src)
			.pipe(plumber({ errorHandler: error }))
			//.pipe(changed(`${config.dist}/${config.img}`))
			.pipe(imageMin())
			.pipe(gulp.dest(`${config.dist}/${config.img}`))
			.on('end', () => {
				notify('Images processed')
				if(typeof cb === 'function') cb()
			})
	}


	new Promise(process)
		.then(() => Promise.all([
			new Promise(ico),
			new Promise(copy)
		]))
		.then(() => {
			if(typeof cb === 'function') cb()
		})
		.catch(console.error)
}


