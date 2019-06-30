var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var relatedReq = getFromApi('artists/'+artist.id+'/related-artists');

        relatedReq.on('end', function(response) {
            artist.related = response.artists;
            var total = 0;
            
            var relatedClosure = function(related){
                
              return  function(response){
                       related.tracks = response.tracks;
                       total++;
                       if(total == artist.related.length){
                           res.json(artist);
                       }
                     }
                     
            }
            
            artist.related.forEach(function(related){
                 var topTracks = getFromApi('artists/'+related.id+'/top-tracks?country=US');
                   topTracks.on('end', relatedClosure(related));
                     topTracks.on('error',function(response){
                         console.log(response);
                         total++;
                        if(total == artist.related.length){
                             res.json(artist);
                        }
                     });
            });         
            
        });
       
    });
    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(process.env.PORT || 8080);