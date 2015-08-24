# JSmdns
mDNS service discovery written in javascript for chrome apps.

#### OBS

This is a refactoring of the mdns browser exstension sample which google have provided here: 
https://github.com/GoogleChrome/chrome-app-samples/tree/master/samples/mdns-browser 
 
I have rewritten it for ease of use.

## How to use
Include either the jsmdns.js or jsmdns.min.js in the header of your html file.  
Your also need permission to system.network and udp sockets so you will have to include this into your exstensions manifesto.

```
  "sockets": {
     "udp": { "bind": "*", "send": "*" }
  },
  "permissions": [ "system.network" ]
```

Example
```
{
  "name": "My App",
  "manifest_version": 2,
  "version": "1.0",
  "app": {
    "background": {
      "scripts": ["background.js"]
    }
  },
  "sockets": {
     "udp": { "bind": "*", "send": "*" }
  },
  "permissions": [ "system.network" ]
}
```

Now you can simply call the findServices function with a callback function to retrieve an array of services with ips.

#### Print return object example
```javascript
findServices(function(result){
  console.log(result)
});
```

#### Structure of findServices result object
The return object is an array of objects each containing and 'service' value and an array 'ips' containing ips where the service is available.
```json
[{
    "service": "",
    "ips": [""]
}]
```

Example
```json
[{
    "service": "_airplay._tcp",
    "ips": ["192.168.0.12"]
}, {
    "service": "_appletv-v2",
    "ips": ["192.168.0.12"]
}, {
    "service": "_nvstream._tcp",
    "ips": ["25.101.228.22", "25.135.157.65", "192.168.0.13"]
}, {
    "service": "_raop",
    "ips": ["192.168.0.12"]
}, {
    "service": "_sleep-proxy",
    "ips": ["192.168.0.12"]
}]
```

#### Real name of services
A list 'serviceTypes' based on /usr/share/avahi/service-types have been generated and can be used like this

```javascript
serviceTypes["_acrobatSRV._tcp"]
>> "Adobe Acrobat"
```

