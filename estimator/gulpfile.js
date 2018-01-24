"use strict";

const gulp = require('gulp'),
    gutil = require('gulp-util'),
    plumber = require('gulp-plumber'),
    concat = require('gulp-concat'),
    babelify = require('babelify'),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    del = require('del'),
    uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    eslint = require('gulp-eslint'),
    watch = require('gulp-watch'),
    tap = require('gulp-tap'),
    livereload = require('gulp-livereload'),
    serverFactory = require('spa-server');

const config = {
        buildType: 'dev',
        cleanFlag: false
    };


/*
  Top level tasks
*/
gulp.task('default', ['dev', 'watch']);
gulp.task('dev', ['init.dev', 'webserver', 'html', 'vendor', 'js']);
gulp.task('prod', ['init.prod', 'html', 'vendor', 'js']);
gulp.task('clean', clean);


/*
  Sub tasks
*/
gulp.task('init.dev', function () {
    config.buildType = 'dev';
    config.cleanFlag = true;
    livereload.listen();
});

gulp.task('init.prod', function() {
    config.buildType = 'prod';
    config.cleanFlag = true;
});

gulp.task('webserver', function () {
    serverFactory.create({
        path: './dist',
        port: 8080,
        fallback: '/index.html'
    })
    .start();
});

gulp.task('preBuild', function(cb) {
// `cleanFlag` prevents clean during watch
    if (config.cleanFlag) {
        config.cleanFlag = false;
        clean(cb);
    }
    else cb();
});

gulp.task('preJs', () => {
    return gulp.src(['./src/js/app.js', './src/js/modules/**/*.js'])
        .pipe(plumber({
          errorHandler: errorHandler
        }))
        // eslint
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
});

gulp.task('html', ['preBuild'], function() {
    return gulp.src('./src/*.html')
        .pipe(gulp.dest('./dist/'))
        .pipe(livereload());
});

gulp.task('vendor', ['preBuild'], function () {
    return gulp.src( './src/js/vendor/**/*.js')
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('./dist/js/'));
});

gulp.task('js', ['preBuild', 'preJs'], function() {
    const src = transpile('./src/js/app.js');

    if (config.buildType === 'prod') {
        return src.pipe(buffer()) // https://github.com/gulpjs/gulp/issues/369
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./dist/js/'));
    }
    else {
        return src.pipe(gulp.dest('./dist/js/'))
            .pipe(livereload());
    }
});

gulp.task('watch', function() {
    gulp.watch('./src/*.html', ['html']);
    gulp.watch('./src/js/vendor/**/*.js', ['vendor']);
    gulp.watch(['./src/js/app.js', './src/js/modules/**/*.js'], ['js']);
});


/*
  Utils
*/
function errorHandler(err) {
    gutil.log(err.toString());
    if (err.codeFrame) {
        gutil.log('\r\n' + err.codeFrame);
    }
    gutil.beep();
    this.emit('end');
}

function transpile(files) {
    return gulp.src(files)
        .pipe(plumber({
            errorHandler: errorHandler
        }))
        .pipe(tap(file => {
            file.contents = browserify(file.path, {debug: true})
                .transform('babelify')
                .bundle()
            }
        ));
}

function clean(cb) {
    del('./dist/**/*')
        .then(paths => {
            // paths.forEach(p => gutil.log(`Removed ${p}`));
            cb();
        })
        .catch(e => {
             gutil.log(`\nError! Clean task failed:`);
             gutil.log('\x1b[31m', e);
        });
}