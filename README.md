# What this is
With a Samsung client or an Intel client and a Cisco WLC/AP, you can map the the RF view of the client on a floomap. This is similar to what you would do when using a simple site survey tool, except that you don't need a site survey tool on your client.

You need to have a laptop (I use MacOS, so this demo is heavily geared toward Mac, but the same principles will work on Linux or Windows, you may just need to research a bit how to install the tools). On the laptop, you run a small app (node.js) that activates a small web server (the server stops as soon as you stop running the app, so you are not converting your laptop into a server, you are just manually running an app). You can then connect to that web server (from the laptop where you run it or from another machine), then upload a floor map. When you walk the floor (with your Samsung/Intel client), you then click where you are on the map. The server saves your coordinates, and instructs your WLC to query your Samsung/Intel client for its RF view (all the APs the client sees from that spot). All that data is saved. Repeat throughout the floor.

Then, at the end, two scripts allow you to cleanup the files you collected during your walk (DataPrep.ipynb) and plot the RF heatmaps of your APs, as seen by the client as you walked around (WiFi-heatmap.ipynb). These files use Jupypter notebook, but they are basic Python script, you can also open them with an editor and run the Python code outside of Jupyter if you prefer. 

# Setup

This setup supposes a C9800 WLC (running 17.1.1 or later), any C9100 AP or newer, and a Samsung galaxy S10 or later.

On your WLC, create a WLAN (for example 'Corporate' below), and make sure that MBO is enabled:

```
C9800(config)#wlan Corporate
C9800(config-wlan)#shut
C9800(config-wlan)#mbo 
C9800(config-wlan)#no shut
C9800(config-wlan)#exit
```

Also make sure that network assurance is enabled on your C9800 (this is a global command):
```
C9800(config)#network-assurance enable
```

# Manually running the capture (to verify)

Once you have a Samsung client connected to your WLAN, check its MAC address, and also that it supports MBO:
```
C9800#show wireless client summary 
Number of Clients: 1

MAC Address    AP Name                                        Type ID   State             Protocol Method     Role
-------------------------------------------------------------------------------------------------------------------------
28c2.1f97.95ce AP2C57.4158.0AF8                               WLAN 1    Run               11ax(2.4) None       Local             

Number of Excluded Clients: 0
```

The client here is 28c2.1f97.95ce. When checking the client details, I can see that it supports MBO, namely link measurements, but also beacon reports:
```
C9800#show wireless client mac-address 28c2.1f97.95ce detail | section Radio Meas
Radio Measurement Enabled Capabilities
  Capabilities: Link Measurement, Neighbor Report, Passive Beacon Measurement, Active Beacon Measurement, Table Beacon Measurement, Statistics Measurement, AP Channel Report
C9800#
```

You are ready to request your client to go scan channels and report its view of the Wi-Fi links. Note that you 'could' also use an Intel client (any 11ax client like the AX200 or newer) with the C9800 running IOS-XE 17.6.1. The main difference is that the Samsung Galaxy phone can also report the cellular connection signal level (which is great!), while the Intel client, expected to be on a laptop, does not suppose an LTE connection (and thus does not report it). 

To take a capture, use the scan-report command to tell your client which channels to visit and report about. An example is as follows:
```
C9800# wireless client mac-address 28c2.1f97.95ce scan-report once mode active bssid all ssid all operating-class 115 channel all delay default duration default
```

As usual on IOS-XE, afgter each keyword, you can use the question mark to see the options and get a brief explanation of each option.

The phone will go scan, come back on the current channel and report back to the AP. You can see the report details on the WLC CLI, in the client 'detail' section, for example:
```
C9800#show wireless client mac-address 28c2.1f97.95ce detail | section Scan Report
Client Scan Report Time : Timer not running
Client Scan Reports 
  Last Report @: 04/19/2023 10:30:02
  BSSID        : c4f7.d54b.bc2f
    Time       : 04/19/2023 10:30:02
    Channel    : 36
    RSSI (dBm) : 70
    SNR  (dB)  : 64
  BSSID        : 1416.9d29.87cf
    Time       : 04/19/2023 10:30:02
    Channel    : 44
    RSSI (dBm) : 76
    SNR  (dB)  : 70
  BSSID        : 00fc.ba97.a1cf
    Time       : 04/19/2023 10:30:02
    Channel    : 161
    RSSI (dBm) : 42
    SNR  (dB)  : 36
```

As the request is made to the Samsung Galaxy phone, it will also report its LTE signal level:
```
C9800#show wireless client mac-address 28c2.1f97.95ce detail | section Cellular
WiFi to Cellular Steering : Implemented
Cellular network type: 4G
Cellular Signal Strength: Good
```

Note the location of the client on your floorplan. Then move to another location and repeat the experiment.

# Running a web server to automate the process

It is much easier to have a floorplan and click where you are, so the system automatically records your coordinates on the floor, and the client view at that position. To do so (this example uses MacOS), you need a small web server running on your laptop and a few scripts. On your laptop, you need node.js and a few accompanying modules. You can install node.js a few ways, I like [nvm-sh](https://github.com/nvm-sh/nvm#installing-and-updating). With this tool installed, you can install node.js with a simple:
```
nvm install --lts
```

Once you have node.js, also install a few helpful modules:
```
npm install express multer expect body-parser
```

In order to connect to the WLC automatically, I use sshpass. Be careful, this tool allows you to store your WLC credentials in the clear, and bypass verification when connecting to the WLC. For a personal laptop and a lab/research project, this is acceptable (because I trust my WLC, so I don't need to verify that no one is impersonating it, and I run node.js on my laptop, so I don't care if the credentials to my WLC are stored in the clear on my mini-web server for the duration of the measurements (things get cleaned up as yous top node.js)), but it would not be okay on a machine exposed to unknown users, and you would of course not use sshpass for security-sensitive applications on a real web server, connected to the Internet. You can install sshpass a few ways, for example with homebrew:
```
brew install esolitos/ipa/sshpass
```

Okay, you have everything. Download the Website folder from this repository. Make sure that the collect_data.exp script can be executed (it will be the one getting to your WLC and fetching the client view). On Mac, from the shell:
```
chmod u+x collect_data.exp
```

# Collecting data

One everything is installed, from the shell, go to the Website foloder, and start node.js with:
```
node server.js
```

You should see a message telling you that the server is running on port 3000. The server is ready. You can connect to it locally with a web browser (localhost:3000), or from anotehr machine (<your laptop IP address>:3000).

The web page will first ask you for your WLC IP address, admin credentials, and the MAC address of the Samsung/Intel client you will use for data collection.

Then, the server will ask you to upload a floorplan image (any standard graphical image format should work). To know the scale of your floorplan, the system will assume that the upper-left corner of the image is (0,0), and will ask you the coordinates of the lower-right corner of the image. The unit (meters, feet, or other) does not matter, as long as you know what you use. The system will use that information to scale the coordinates of the points you click (so, if you declare that your bottom-righ corner coordinates are (100,50), and you click right in the midle of the image, the system will record the position (50, 25)).

Once the map is uploaded, all you need to do is walk the floor, then click on the map where you are. The server will record your current position (X,Y) in the positions.txt file, and will conenct to your WLC with the credentials you entered, and will collect from your client its view of all channels, that the server will save in output.txt. Teh data is raw, and will be cleaned up at next stage. Repeat for all the points on the floow where you want to colelct the client's view.




# Processing the data and drawing a floormap

Once you have collected as many reports as you needed, each time noting the location of the client on the map, you are ready to process the data and draw a map that represents the view of your client. For this, two Jupyter notebooks are at your disposal:
* DataPrep helps format the data. The expectation is that, during the collection above, you used the above, or another basic export script (or you copy/pasted) the Scan Report and the Cellular sections to a txt file, one report after another. In another file, you documented the position of each collection point. So the DataPrep notebook helps you convert these raw data files into a nice .csv file that includes each location, each AP, and the collected signal. I documented the process in the notebook, but contact me if you can't make it work.
* wifi-heatmap is a modified version of the great work done by Beau Bunderson at https://github.com/beaugunderson/wifi-heatmap. Not all functions in his work were useful for this map, and he uses functions that were probably great in the days of Python 2.7 (but I use Python 3.x), so wifi-heatmap contains quite a few modifications and simplifications. The notebook takes the .csv file generated above, a floorplan semi-transparent .png file, and overlays the heatmap of each AP as seen from your client, something like this:

![alt text](https://github.com/jhenry-github/floor-heatmap/blob/main/example-visual.png?raw=true)

As above, the notebook contains comments to help you, but reach out if you encounter issues.

