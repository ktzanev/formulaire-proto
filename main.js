---
---

// les données à remplir dans le formulaire
// ----------------------------------------
var donnees_formulaire = {
  {% for s in site.data.fields %}// --- {{s.section}} ---
  {% for f in s.fields %}{% if f.variable and f.type != 'totalprix' %}"{{f.variable}}" : {% if f.default %}"{{f.default}}"{% else %}null{% endif %},
  {% endif %}{% endfor %}{% endfor %}
  // Les constantes des prix
  {% for p in site.data.prix %}"{{p[0]}}" : "{{p[1]}}",
  {% endfor %}
  // Les cadre dans lesquelle peut avoir lieu l'invitation
  "type_cadre" : {{ site.data.cadres | jsonify }}
};


// passage de {{}} à [[]] pour compatibilité avec Jackyll
// ------------------------------------------------------
Vue.config.delimiters = ['[[', ']]'];
Vue.config.unsafeDelimiters = ['[[[', ']]]'];

// La directive pour les champs date
// ---------------------------------
Vue.directive('pikaday', {
  twoWay: true,
  priority: 0,
  params: ['format', 'min', 'max'],
  paramWatchers: {
    min : function (val, oldVal) {
      this.instance.setMinDate(new Date(val));
    },
    max : function (val, oldVal) {
      this.instance.setMaxDate(new Date(val));
    }
  },
  bind: function () {
    var _this = this;
    var i18n;

    i18n = {
        previousMonth: 'Précedent',
        nextMonth: 'Suivant',
        months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'],
        weekdays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        weekdaysShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    };

    _this.instance = new Pikaday({
        field: _this.el,
        i18n: i18n,
        minDate: _this.params.min && new Date(_this.params.min),
        maxDate: _this.params.max && new Date(_this.params.max),
        format: _this.params.format || 'DD/MM/YYYY',
        onSelect: function () {
            // _this.set(this.getDate().toISOString().slice(0, 10));
            _this.set(this.getMoment().format('YYYY-MM-DD'));
        }
    });
  },
  update: function (val, oldVal) {
      var _this = this;

      _this.el.value = val;
      _this.instance.setDate(val);
  },
  unbind: function () {
      var _this = this;

      _this.instance.destroy();
  }
});

// affichage des prix en euros
// --------------------------

Vue.filter('euro', function (value) {
  return (Math.round(value*100)/100).toLocaleString() + "&nbsp;€"
});

// Fonction pour mettre les majuscules des prénoms
// -----------------------------------------------
function capitalizeWords(s) {
  return s.toLowerCase().replace(/^[a-zA-Z\u00C0-\u117F]|[^a-zA-Z\u00C0-\u117F][a-zA-Z\u00C0-\u117F]/g, function(a){return a.toUpperCase()});
}

// Le "logique" du formulaire
// --------------------------
vm =
  new Vue({
    el : '#app',
    data : donnees_formulaire,
    methods : {
      setCadre : function(cadre) {
        if (!cadre)
          return;

        this.setMoyens(cadre.moyens);

        if (!(cadre.resp && cadre.resp.length==1))
          return;

        this.setResp(cadre.resp[0]);
      },
      setResp : function(resp) {
        this.invitant = resp.nom;
        this.mail_invitant = resp.mail;
        Vue.nextTick(function() {
          vm.next('nom_invite');
        });
      },
      setMoyens : function(moyens) {
        if (!moyens)
          return;

        this.budget = moyens.budget;
        this.contrat = moyens.contrat;
        this.nom_responsable = moyens.nom_responsable;
      },
      next : function(id) {
        var el = document.getElementById(id);
        if(!el)
          return;

        el.focus();
        var parent_div = Sizzle('div.field-container:has(#'+id+')')[0];
        window.scrollBy(0,parent_div.offsetHeight);
      },
      isValidMail : function(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
      },
    },
    computed: {
      invite : function() {
        return (this.prenom_invite ? capitalizeWords(this.prenom_invite) : "")
               +" "+ (this.nom_invite ? this.nom_invite.toUpperCase() : "");
      },
      duree_sejour : function() {
        if (!this.date_debut || !this.date_fin)
          return 0;
        var date1 = new Date(this.date_debut);
        var date2 = new Date(this.date_fin);
        var timeDiff = Math.abs(date2.getTime() - date1.getTime());
        var duree = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return duree;
      },
      dates : function() {
        if (!this.date_debut || !this.date_fin)
          return "";
        return this.duree_sejour == 0 ?
                "le " + this.date_debut :
                "du " + this.date_debut + " au " + this.date_fin;
      },
      total_transport : function() {
        if (this.transport) {
          return this.prix_transport;
        }
        return 0;
      },
      total_hotel : function() {
        if (this.hotel == "remboursement" && this.hotel_remboursement=="forfait") {
          return this.prix_forfait_nuit*this.nuits_hotel;
        }
        else if (this.hotel == "avec bon de commande" || this.hotel == "remboursement" && this.hotel_remboursement=="frais réels" ) {
          return this.prix_hotel_nuit*this.nuits_hotel;
        }
        return 0;
      },
      total_repas : function() {
        var total = 0;

        if (this.repas == 'oui - forfait') {
          total += this.nombre_repas*this.prix_forfait_repas;
        }
        else if (this.repas == 'oui - frais réels') {
          total += this.prix_repas;
        }
        total += this.prix_ticket_ru*this.tickets_ru;

        return total;
      },
      total_frais : function() {
        return this.total_transport
              + this.total_hotel
              + this.total_repas;
      }
    },
    watch: {
      'date_debut' : function(val, oldVal) {
        if (!this.date_fin || this.date_fin == oldVal)
          this.date_fin = val;
      },
      'duree_sejour' : function(val, oldVal){
        if (!this.nuits_hotel || this.nuits_hotel == oldVal || this.nuits_hotel > val) {
          this.nuits_hotel = val;
        }
      }
    }
  });


