flixtor
=======

Turn your Raspberry Pi into a movie box. Stream and watch videos from torrents easily with a web remote.

## Install
First you need to install the Node.js package for ARM:

	wget http://node-arm.herokuapp.com/node_latest_armhf.deb
	sudo dpkg -i node_latest_armhf.deb



Get the app files and build:
	
	wget https://github.com/nilakshdas/flixtor/archive/v0.0.0-alpha.tar.gz
	tar -xvzf v0.0.0-alpha.tar.gz
	cd flixtor-0.0.0-alpha/
	npm install



## Usage
In the root folder, run:

	node app.js


_You can also add a script on your Raspberry Pi to run this app automatically on startup._

This creates a web remote on the port **3000** at the network address of the host. 
