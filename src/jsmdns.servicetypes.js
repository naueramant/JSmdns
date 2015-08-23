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