Àlir est une application qui permet de conserver et de lire des articles issus de sites Web ou de flux d’information. Elle a été optimisée pour fonctionner sur les téléphones équipés de Firefox OS, mais comme c’est une application HTML, elle devrait fonctionner dans n’importe quel navigateur Web moderne, à peine amputée de quelques fonctionnalités. C’est une application autonome, vous n’avez pas besoin pour l’utiliser de créer un compte sur un serveur ou d’installer des logiciels sur votre serveur.

## Caractéristiques

 - vous n’avez pas besoin d’avoir du réseau pour l’utiliser. Les articles sont stockés dans l’application et toujours accessibles, vous pouvez les lire même si vous êtes dans le métro ou au fin fond d’une grotte ;
 - vous pouvez annoter les article et leur affecter des étiquettes ;
 - cliquez sur n’importe quel lien à l’intérieur d’un article pour ajouter l’aricle cible à l’application ;
 - vous pouvez vous abonner à vos flux d’information préférés et en lire les articles à l’intérieur d’Àlir ;
 - vous pouvez partager les articles et vos notes sur les principaux réseaux sociaux ;
 - en créant un compte sur un serveur, ou en installant votre propre serveur, vous pourrez synchroniser vos articles entre tous vos terminaux : téléphone, tablette, ordinateur…
 - l’application est personnalisable : taille des caractères, thèmes…
 - Àlir est un logiciel libre, vous êtes libre de l’utiliser comme bon vous semble, de l’apprécier, de la bidouiller et de l’offrir à vos amis ou vos ennemis ;


## J’ai besoin de vous

Je bidouille ce bousin depuis « quelques » mois, et il commence à être utilisable. Mais comme il a pas mal de fonctionnalités et que je ne sais pas coder, il reste beaucoup de problèmes, que je voudrais essayer de corriger avant de soumettre l’application à l’épicerie Mozilla. J’ai besoin de retours, j’ai besoin d’aventurier sans peur et sans reproche pour la défricher et me signaler les problèmes. Si vous avez un FirefoxPhone et savez y installer des application, je vous serai très reconnaissant de tout coup de main.

## Installation

Pour tester l’application, il vous faudra tout d’abord l’installer sur votre téléphone. Elle n’a pas encore été revue par l’équipe de l’épicerie Mozilla, donc installez-la à vos risques et périls.

Elle a besoin d’accéder à certaines fonctionnalités réservées aux applications certifiées, en attendant qu’elle soit dans les rayons de l’épicerie, vous devrez passer par le gestionnaire d’applications de Firefox pour l’installer. Pour cela, téléchargez une archive [zip](https://github.com/clochix/alir/zipball/master) ou [tar](https://github.com/clochix/alir/tarball/master), ou [clonez le projet](https://github.com/clochix/alir) sur Github, et ajoutez l’application dans l’App Manager.

Si vous voulez également utiliser l’application sur votre ordinateur et la synchroniser avec le téléphone, il vous faudra installer l’extension sise dans le dossier `addon` et créer un compte de synchronisation. Vous pouvez installer votre propre serveur, mais je vous conseille de juste [ouvrir un compte gratuit chez mon hébergeur](https://5apps.com/users/sign_up?site=deploy), 5apps. Vous obtiendrez une adresse vous permettant de connecter l’application au serveur de synchronisation.

## Une belle histoire

Vous surfez tranquillement depuis le navigateur de votre téléphone lorsque vous tombez sur un article qui semble fort intéressant, mais est trop long pour le lire tout de suite. Vous voudriez le mettre de côté pour le lire ce soir, dans le train du retour. Rien de plus simple, cliquez simplement sur le bouton de partage dans la barre d’outil en bas du navigateur, et choisissez de partager l’article avec Alir. Si tout se passe bien, une notification devrait vous confirmer qu’il a été enregistré. Vous pouvez retourner travailler.

Ça y est, la journée est finie, vous êtes dans le train du retour (si vous êtes sur votre vélo, l’application ne fonctionnera pas) et avez hâte d’enfin lire l’article. Ouvrez Àlir, il est là, cliquez sur son titre et lisez !

*Astuce :* l’ascenseur sur la gauche sert également de menu de navigation principal. Cliquez dessus pour accéder aux paramètres de l’application et à la gestion de vos abonnements à des flux. Si vous êtes connectés à un serveur de synchronisation, vous pouvez également via ce menu forcer la synchronisation et passer en mode hors-ligne, pour économiser de la bande passante.

Si votre lecture vous inspire des réflexions, pour pouvez annoter chaque paragraphe. Une pression longue (ou un double clic) ouvre un formulaire où vous pouvez saisir une note, à laquelle vous pourrez ensuite accéder soit via une icône à côté du paragraphe, soit via le lien « Notes » sous le titre de l’article. Un bouton sous chaque note nous permet de la partager.

Si un lien dans l’article vous intrigue, cliquez dessus, vous aurez le choix de l’ouvrir dans le navigateur ou de l’ajouter à l’application pour le lire plus tard.

Dans le coin en haut à droite, un hamburger stylisé ouvre un menu de gestion de l’article, vous permettant de le supprimer, de l’archiver (les articles archivés ne sont plus affichés par défaut), de l’ajouter à vos favoris et de gérer ses étiquettes (celles-ci sont affichés dans l’onglet « Metas » sous le titre). Si le site d’origine de l’article propose des flux, vous devriez également voir dans le menu la fameuse icône RSS. Cliquez dessus pour vous abonner à un flux.

## Les flux

Vous pouvez vous abonner à des flux soit à partir d’un article (c’est le plus simple), ou en cliquant sur l’icône RSS dans le menu de la barre de gauche, et créant un flux en saisissant sont URL.

Lorsque vous créez un flux, donnez lui un nom court. Les articles issus du flux auront une étiquette reprenant ce nom. Si le flux ne contient pas l’intégralité de l’article, cochez la case « Flux résumé », et Àlir essaiera de récupérer les articles originaux.

Une icône en haut de la liste des flux vous permet de les mettre tous à jour. Vous pouvez en actualiser un individuellement en le sélectionnant et cliquant sur son icône de rafraichissement. Par défaut, l’application va essayer de mettre à jour les flux toutes les heures (vous pouvez modifier cette durée dans les paramètres);

Les articles issus de flux ne sont pas affichés par défaut sur l’écran d’accueil, cliquez sur le filtre RSS en haut de la liste pour les afficher.


## Se synchroniser

Partager des contenu avec votre téléphone depuis le navigateur de votre ordinateur est aisé. Il vous suffit d’un compte sur un serveur de synchronisation et d’installer l’extension Àlir (cf explications d’installation ci-dessus). Pour partager un article, cliquez sur l’icône de l’extension, choisissez « Cleanup » pour ne conserver que l’article, puis envoyez l’article sur le serveur `Remote storage`. Si l’application du téléphone est connectée au même serveur, l’article apparaitra quelques secondes plus tard sur le téléphone.


## Captures d’écran

Quelques captures pour récompenser les curieux qui ont lu jusqu’ici :

La liste des articles
![Liste des articles](https://raw.github.com/clochix/alir/master/doc/articleList.png)

Le menu principal
![Menu](https://raw.github.com/clochix/alir/master/doc/menu.png)

Affichage d’un article
![Un article](https://raw.github.com/clochix/alir/master/doc/article.png)

Contenu d’un flux
![flux](https://raw.github.com/clochix/alir/master/doc/feedDetail.png)

