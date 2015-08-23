/**
 * DataWriter writes data to an ArrayBuffer, presenting it as the instance
 * variable 'buffer'.
 *
 * @constructor
 */
var DataWriter = function(opt_size) {
  var loc = 0;
  var view = new Uint8Array(new ArrayBuffer(opt_size || 512));

  this.byte_ = function(v) {
    view[loc] = v;
    ++loc;
    this.buffer = view.buffer.slice(0, loc);
  }.bind(this);
};

DataWriter.prototype.byte = function(v) {
  this.byte_(v);
  return this;
};

DataWriter.prototype.short = function(v) {
  return this.byte((v >> 8) & 0xff).byte(v & 0xff);
};

DataWriter.prototype.long = function(v) {
  return this.short((v >> 16) & 0xffff).short(v & 0xffff);
};

/**
 * Writes a DNS name. If opt_ref is specified, will finish this name with a
 * suffix reference (i.e., 0xc0 <ref>). If not, then will terminate with a NULL
 * byte.
 */
DataWriter.prototype.name = function(v, opt_ref) {
  var parts = v.split('.');
  parts.forEach(function(part) {
    this.byte(part.length);
    for (var i = 0; i < part.length; ++i) {
      this.byte(part.charCodeAt(i));
    }
  }.bind(this));
  if (opt_ref) {
    this.byte(0xc0).byte(opt_ref);
  } else {
    this.byte(0);
  }
  return this;
};

/**
 * DataConsumer consumes data from an ArrayBuffer.
 *
 * @constructor
 */
var DataConsumer = function(arg) {
  if (arg instanceof Uint8Array) {
    this.view_ = arg;
  } else {
    this.view_ = new Uint8Array(arg);
  }
  this.loc_ = 0;
};

/**
 * @return whether this DataConsumer has consumed all its data
 */
DataConsumer.prototype.isEOF = function() {
  return this.loc_ >= this.view_.byteLength;
};

/**
 * @param length {integer} number of bytes to return from the front of the view
 * @return a Uint8Array 
 */
DataConsumer.prototype.slice = function(length) {
  var view = this.view_.subarray(this.loc_, this.loc_ + length);
  this.loc_ += length;
  return view;
};

DataConsumer.prototype.byte = function() {
  this.loc_ += 1;
  return this.view_[this.loc_ - 1];
};

DataConsumer.prototype.short = function() {
  return (this.byte() << 8) + this.byte();
};

DataConsumer.prototype.long = function() {
  return (this.short() << 16) + this.short();
};

/**
 * Consumes a DNS name, which will either finish with a NULL byte or a suffix
 * reference (i.e., 0xc0 <ref>).
 */
DataConsumer.prototype.name = function() {
  var parts = [];
  for (;;) {
    var len = this.byte();
    if (!len) {
      break;
    } else if (len == 0xc0) {
      // TODO: This indicates a pointer to another valid name inside the
      // DNSPacket, and is always a suffix: we're at the end of the name.
      // We should probably hold onto this value instead of discarding it.
      var ref = this.byte();
      break;
    }

    // Otherwise, consume a string!
    var v = '';
    while (len-- > 0) {
      v += String.fromCharCode(this.byte());
    }
    parts.push(v);
  }
  return parts.join('.');
};

/**
 * DNSPacket holds the state of a DNS packet. It can be modified or serialized
 * in-place.
 *
 * @constructor
 */
var DNSPacket = function(opt_flags) {
  this.flags_ = opt_flags || 0; /* uint16 */
  this.data_ = {'qd': [], 'an': [], 'ns': [], 'ar': []};
};

/**
 * Parse a DNSPacket from an ArrayBuffer (or Uint8Array).
 */
DNSPacket.parse = function(buffer) {
  var consumer = new DataConsumer(buffer);
  if (consumer.short()) {
    throw new Error('DNS packet must start with 00 00');
  }
  var flags = consumer.short();
  var count = {
    'qd': consumer.short(),
    'an': consumer.short(),
    'ns': consumer.short(),
    'ar': consumer.short(),
  };
  var packet = new DNSPacket(flags);

  // Parse the QUESTION section.
  for (var i = 0; i < count['qd']; ++i) {
    var part = new DNSRecord(
        consumer.name(),
        consumer.short(),  // type
        consumer.short()); // class
    packet.push('qd', part);
  }

  // Parse the ANSWER, AUTHORITY and ADDITIONAL sections.
  ['an', 'ns', 'ar'].forEach(function(section) {
    for (var i = 0; i < count[section]; ++i) {
      var part = new DNSRecord(
          consumer.name(),
          consumer.short(), // type
          consumer.short(), // class
          consumer.long(),  // ttl
          consumer.slice(consumer.short()));
      packet.push(section, part);
    }
  });

  consumer.isEOF() || console.warn('was not EOF on incoming packet');
  return packet;
};

DNSPacket.prototype.push = function(section, record) {
  this.data_[section].push(record);
};

DNSPacket.prototype.each = function(section) {
  var filter = false;
  var call;
  if (arguments.length == 2) {
    call = arguments[1];
  } else {
    filter = arguments[1];
    call = arguments[2];
  }
  this.data_[section].forEach(function(rec) {
    if (!filter || rec.type == filter) {
      call(rec);
    }
  });
};

/**
 * Serialize this DNSPacket into an ArrayBuffer for sending over UDP.
 */
DNSPacket.prototype.serialize = function() {
  var out = new DataWriter();
  var s = ['qd', 'an', 'ns', 'ar'];

  out.short(0).short(this.flags_);

  s.forEach(function(section) {
    out.short(this.data_[section].length);
  }.bind(this));

  s.forEach(function(section) {
    this.data_[section].forEach(function(rec) {
      out.name(rec.name).short(rec.type).short(rec.cl);

      if (section != 'qd') {
        // TODO: implement .bytes()
        throw new Error('can\'t yet serialize non-QD records');
//        out.long(rec.ttl).bytes(rec.data_);
      }
    });
  }.bind(this));

  return out.buffer;
};

/**
 * DNSRecord is a record inside a DNS packet; e.g. a QUESTION, or an ANSWER,
 * AUTHORITY, or ADDITIONAL record. Note that QUESTION records are special,
 * and do not have ttl or data.
 */
var DNSRecord = function(name, type, cl, opt_ttl, opt_data) {
  this.name = name;
  this.type = type;
  this.cl = cl;

  this.isQD = (arguments.length == 3);
  if (!this.isQD) {
    this.ttl = opt_ttl;
    this.data_ = opt_data;
  }
};

DNSRecord.prototype.asName = function() {
  return new DataConsumer(this.data_).name();
};

/**
 * Construct a new ServiceFinder. This is a single-use object that does a DNS
 * multicast search on creation.
 * @constructor
 * @param {function} callback The callback to be invoked when this object is
 *                            updated, or when an error occurs (passes string).
 */
var ServiceFinder = function(callback) {
    this.callback_ = callback;
    this.byIP_ = {};
    this.byService_ = {};

    // Set up receive handlers.
    this.onReceiveListener_ = this.onReceive_.bind(this);
    chrome.sockets.udp.onReceive.addListener(this.onReceiveListener_);
    this.onReceiveErrorListener_ = this.onReceiveError_.bind(this);
    chrome.sockets.udp.onReceiveError.addListener(this.onReceiveErrorListener_);

    ServiceFinder.forEachAddress_(function(address, error) {
        if (error) {
            this.callback_(error);
            return true;
        }
        if (address.indexOf(':') != -1) {
            // TODO: ipv6.
            console.log('IPv6 address unsupported', address);
            return true;
        }
        console.log('Broadcasting to address', address);

        ServiceFinder.bindToAddress_(address, function(socket) {
            if (!socket) {
                this.callback_('could not bind UDP socket');
                return true;
            }
            // Broadcast on it.
            this.broadcast_(socket, address);
        }.bind(this));
    }.bind(this));

    // After a short time, if our database is empty, report an error.
    setTimeout(function() {
        if (!Object.keys(this.byIP_).length) {
            this.callback_('no mDNS services found!');
        }
    }.bind(this), 10 * 1000);
};

/**
 * Invokes the callback for every local network address on the system.
 * @private
 * @param {function} callback to invoke
 */
ServiceFinder.forEachAddress_ = function(callback) {
    chrome.system.network.getNetworkInterfaces(function(networkInterfaces) {
        if (!networkInterfaces.length) {
            callback(null, 'no network available!');
            return true;
        }
        networkInterfaces.forEach(function(networkInterface) {
            callback(networkInterface['address'], null);
        });
    });
};

/**
 * Creates UDP socket bound to the specified address, passing it to the
 * callback. Passes null on failure.
 * @private
 * @param {string} address to bind to
 * @param {function} callback to invoke when done
 */
ServiceFinder.bindToAddress_ = function(address, callback) {
    chrome.sockets.udp.create({}, function(createInfo) {
        chrome.sockets.udp.bind(createInfo['socketId'], address, 0,
            function(result) {
                callback((result >= 0) ? createInfo['socketId'] : null);
            });
    });
};

/**
 * Sorts the passed list of string IPs in-place.
 * @private
 */
ServiceFinder.sortIps_ = function(arg) {
    arg.sort(ServiceFinder.sortIps_.sort);
    return arg;
};
ServiceFinder.sortIps_.sort = function(l, r) {
    // TODO: support v6.
    var lp = l.split('.').map(ServiceFinder.sortIps_.toInt_);
    var rp = r.split('.').map(ServiceFinder.sortIps_.toInt_);
    for (var i = 0; i < Math.min(lp.length, rp.length); ++i) {
        if (lp[i] < rp[i]) {
            return -1;
        } else if (lp[i] > rp[i]) {
            return +1;
        }
    }
    return 0;
};
ServiceFinder.sortIps_.toInt_ = function(i) {
    return +i
};

/**
 * Returns the services found by this ServiceFinder, optionally filtered by IP.
 */
ServiceFinder.prototype.services = function(opt_ip) {
    var k = Object.keys(opt_ip ? this.byIP_[opt_ip] : this.byService_);
    k.sort();
    return k;
};

/**
 * Returns the IPs found by this ServiceFinder, optionally filtered by service.
 */
ServiceFinder.prototype.ips = function(opt_service) {
    var k = Object.keys(opt_service ? this.byService_[opt_service] : this.byIP_);
    return ServiceFinder.sortIps_(k);
};

/**
 * Handles an incoming UDP packet.
 * @private
 */
ServiceFinder.prototype.onReceive_ = function(info) {
    var getDefault_ = function(o, k, def) {
        (k in o) || false == (o[k] = def);
        return o[k];
    };

    // Update our local database.
    // TODO: Resolve IPs using the dns extension.
    var packet = DNSPacket.parse(info.data);
    var byIP = getDefault_(this.byIP_, info.remoteAddress, {});

    packet.each('an', 12, function(rec) {
        var ptr = rec.asName();
        var byService = getDefault_(this.byService_, ptr, {})
        byService[info.remoteAddress] = true;
        byIP[ptr] = true;
    }.bind(this));

    // Ping! Something new is here. Only update every 25ms.
    if (!this.callback_pending_) {
        this.callback_pending_ = true;
        setTimeout(function() {
            this.callback_pending_ = undefined;
            this.callback_();
        }.bind(this), 25);
    }
};

/**
 * Handles network error occured while waiting for data.
 * @private
 */
ServiceFinder.prototype.onReceiveError_ = function(info) {
    this.callback_(info.resultCode);
    return true;
}

/**
 * Broadcasts for services on the given socket/address.
 * @private
 */
ServiceFinder.prototype.broadcast_ = function(sock, address) {
    var packet = new DNSPacket();
    packet.push('qd', new DNSRecord('_services._dns-sd._udp.local', 12, 1));

    var raw = packet.serialize();
    chrome.sockets.udp.send(sock, raw, '224.0.0.251', 5353, function(sendInfo) {
        if (sendInfo.resultCode < 0)
            this.callback_('Could not send data to:' + address);
    });
};

ServiceFinder.prototype.shutdown = function() {
    // Remove event listeners.
    chrome.sockets.udp.onReceive.removeListener(this.onReceiveListener_);
    chrome.sockets.udp.onReceiveError.removeListener(this.onReceiveErrorListener_);
    // Close opened sockets.
    chrome.sockets.udp.getSockets(function(sockets) {
        sockets.forEach(function(sock) {
            chrome.sockets.udp.close(sock.socketId);
        });
    });
}

/**
* Define the callback of the finder
* @private
**/
var finder;
var mode = 'service';
var fundServicesCallback;

var callback_ = function(opt_error) {

    var resultMDNS = [];

    if (opt_error) {
        return console.warn(opt_error);
    }

    var outer = finder.services;
    var inner = finder.ips;

    outer.apply(finder).forEach(function(o) {

        var tempobj = {};
        tempobj.service = o;

        var tempips = [];
        inner.call(finder, o).forEach(function(i) {
            tempips.push(i);
        });
        tempobj.ips = tempips;
        resultMDNS.push(tempobj);
    });
    if(typeof fundServicesCallback == 'function')
      fundServicesCallback(resultMDNS);
};

/**
* Find the services and return callback with result object;
* @public
**/
function findServices(callback) {
    fundServicesCallback = callback;
    finder && finder.shutdown();
    finder = new ServiceFinder(callback_);
}

/**
** Lookup for real names of services
**/
var serviceTypes = {
  '_acrobatSRV._tcp': 'Adobe Acrobat',
  '_adisk._tcp': 'Apple TimeMachine',
  '_adobe-vc._tcp': 'Adobe Version Cue',
  '_afpovertcp._tcp': 'Apple File Sharing',
  '_airport._tcp': 'Apple AirPort',
  '_apt._tcp': 'APT Package Repository',
  '_bzr._tcp': 'Bazaar',
  '_cros_p2p._tcp': 'Chrome OS P2P Update',
  '_daap._tcp': 'iTunes Audio Access',
  '_dacp._tcp': 'iTunes Remote Control',
  '_distcc._tcp': 'Distributed Compiler',
  '_domain._udp': 'DNS Server',
  '_dpap._tcp': 'Digital Photo Sharing',
  '_ftp._tcp': 'FTP File Transfer',
  '_h323._tcp': 'H.323 Telephony',
  '_home-sharing._tcp': 'Apple Home Sharing',
  '_https._tcp': 'Secure Web Site',
  '_http._tcp': 'Web Site',
  '_iax._udp': 'Asterisk Exchange',
  '_imap._tcp': 'IMAP Mail Access',
  '_ipp._tcp': 'Internet Printer',
  '_ksysguard._tcp': 'KDE System Guard',
  '_ldap._tcp': 'LDAP Directory Server',
  '_libvirt._tcp': 'Virtual Machine Manager',
  '_lobby._tcp': 'Gobby Collaborative Editor Session',
  '_MacOSXDupSuppress._tcp': 'MacOS X Duplicate Machine Suppression',
  '_mpd._tcp': 'Music Player Daemon',
  '_mumble._tcp': 'Mumble Server',
  '_net-assistant._udp': 'Apple Net Assistant',
  '_nfs._tcp': 'Network File System',
  '_ntp._udp': 'NTP Time Server',
  '_odisk._tcp': 'DVD or CD Sharing',
  '_omni-bookmark._tcp': 'OmniWeb Bookmark Sharing',
  '_pdl-datastream._tcp': 'PDL Printer',
  '_pgpkey-hkp._tcp': 'GnuPG/PGP HKP Key Server',
  '_pop3._tcp': 'POP3 Mail Access',
  '_pop3._tcp': 'Posta - POP3',
  '_postgresql._tcp': 'PostgreSQL Server',
  '_presence_olpc._tcp': 'OLPC Presence',
  '_presence._tcp': 'iChat Presence',
  '_printer._tcp': 'UNIX Printer',
  '_pulse-server._tcp': 'PulseAudio Sound Server',
  '_pulse-sink._tcp': 'PulseAudio Sound Sink',
  '_pulse-source._tcp': 'PulseAudio Sound Source',
  '_raop._tcp': 'AirTunes Remote Audio',
  '_realplayfavs._tcp': 'RealPlayer Shared Favorites',
  '_remote-jukebox._tcp': 'Remote Jukebox',
  '_rfb._tcp': 'VNC Remote Access',
  '_rss._tcp': 'Web Syndication RSS',
  '_rtp._udp': 'RTP Realtime Streaming Server',
  '_rtsp._tcp': 'RTSP Realtime Streaming Server',
  '_see._tcp': 'SubEthaEdit Collaborative Text Editor',
  '_sftp-ssh._tcp': 'SFTP File Transfer',
  '_shifter._tcp': 'Window Shifter',
  '_sip._udp': 'SIP Telephony',
  '_skype._tcp': 'Skype VoIP',
  '_smb._tcp': 'Microsoft Windows Network',
  '_ssh._tcp': 'SSH Remote Terminal',
  '_svn._tcp': 'Subversion Revision Control',
  '_telnet._tcp': 'Telnet Remote Terminal',
  '_tftp._udp': 'TFTP Trivial File Transfer',
  '_timbuktu._tcp': 'Timbuktu Remote Desktop Control',
  '_touch-able._tcp': 'iPod Touch Music Library',
  '_tp-https._tcp': 'Thousand Parsec Server (Secure HTTP Tunnel)',
  '_tp-http._tcp': 'Thousand Parsec Server (HTTP Tunnel)',
  '_tps._tcp': 'Thousand Parsec Server (Secure)',
  '_tp._tcp': 'Thousand Parsec Server',
  '_udisks-ssh._tcp': 'Remote Disk Management',
  '_vlc-http._tcp': 'VLC Streaming',
  '_webdavs._tcp': 'Secure WebDAV File Share',
  '_webdav._tcp': 'WebDAV File Share',
  '_workstation._tcp': 'Workstation',
};