# floor-heatmap
A short python script to draw a floor heatmap from a Wi-Fi client MBO responses on Cisco WLCs. The WLC asks the client to go scan one or more Wi-Fi channels, and report back how it hears the APs on those channels, thus giving you the 'view of the client', that you can combine with how the APs hear that client, and thus get a two-way view of the RF environement.

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

# Running the capture

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


# Processing the data and drawing a floormap

Once you have collected as many reports as you needed, each time noting the location of the client on the map, you are ready to process the data and draw a map that represents the view of your client. For this, two Jupyter notebooks are at your disposal:
* DataPrep helps format the data. The expectation is that, during the collection above, you used a basic export script (or you copy/pasted) the Scan Report and the Cellular sections to a txt file, one report after another. In another file, you probably documented the position of each collection point. So the DataPrep notebook helps you convert these raw data files into a nice .csv file that includes each location, each AP, and the collected signal. I documented the process in the notebook, but contact me if you can't make it work.
* wifi-heatmap is a modified version of the great work done by Beau Bunderson at https://github.com/beaugunderson/wifi-heatmap. Not all functions in his work were useful for this map, and he uses functions that were probably great in the days of Python 2.7 (but I use Python 3.x), so wifi-heatmap contains quite a few modifications and simplifications. The notebook takes the .csv file generated above, a floorplan semi-transparent .png file, and overlays the heatmap of each AP as seen from your client, something like this:

![alt text](https://github.com/jhenry-github/floor-heatmap/blob/main/example-visual.png?raw=true)

As above, the notebook contains comments to help you, but reach out if you encounter issues.

