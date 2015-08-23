window.addEventListener('load', function() {
    document.getElementsByClassName("hbtn")[0].addEventListener("click", refresh);
    refresh();
});

var refresh = function() {
    var rescontainer = document.getElementsByClassName("container")[0];
    rescontainer.innerHTML = "";
    findServices(function(result) {
        result.forEach(function(service) {
            var ul = document.createElement('p');
            var strong = document.createElement("strong");
            var name = document.createTextNode(service.service);
            strong.appendChild(name);
            rescontainer.appendChild(strong);

            service.ips.forEach(function(ip) {
                var li = document.createElement('p');
                var text = document.createTextNode(ip);
                li.appendChild(text);
                ul.appendChild(li);
            });
            rescontainer.appendChild(ul);
        });
    });
}
