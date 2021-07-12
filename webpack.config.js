const isDevelopment = true;// TODO process.env.NODE_ENV === 'development';

// TODO change to import
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    entry: path.resolve(__dirname, 'src', 'index.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: ['babel-loader', 'eslint-loader']
            },
            // {
            //   test: /\.module\.s(a|c)ss$/,
            //   loader: [
            //     isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            //     {
            //       loader: 'css-loader',
            //       options: {
            //         modules: true,
            //         sourceMap: isDevelopment
            //       }
            //     },
            //     {
            //       loader: 'sass-loader',
            //       options: {
            //         sourceMap: isDevelopment
            //       }
            //     }
            //   ]
            // },
            {
                test: /\.css$/,
                use: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /\.s(a|c)ss$/,
                exclude: /\.module.(s(a|c)ss)$/,
                use: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: isDevelopment
                        }
                    }
                ]
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: 'file-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.scss'],
        alias: {
            '@resources': path.resolve(__dirname, 'resources')
        }
    },
    // devServer: {
    //     contentBase: path.join(__dirname, 'dist'),
    //     compress: true,
    //     port: 9000
    // },
    // add a custom index.html as the template
    plugins: [
        new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'src', 'index.html') }),
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css'
        })
    ],
    devtool: 'inline-source-map',
    devServer: {
        publicPath: '/',
        historyApiFallback: true
    }
};
