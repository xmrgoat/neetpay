Ce document explique en détail comment utiliser notre système API et fournit des exemples pour toutes les demandes. Toutes les méthodes sont GET, et vous devez simplement inclure votre code de clé API dans l'en-tête pour obtenir des réponses du serveur. Pour inclure la clé API, utilisez: headers = {'API-Key': 'Example-API-Key'}; Suivez les étapes suivantes pour commencer à l'utiliser :


Téléchargez la liste de tous les jetons du serveur en utilisant la méthode COINS. Vous ne devez le faire qu'une seule fois. Vous devrez utiliser à la fois le ticker et le réseau de chaque jeton pour effectuer les autres demandes, car il existe des jetons sur différents réseaux qui ont le même ticker (par exemple Matic ERC20 et Polygon). Enregistrez ces jetons dans votre base de données.
Générer de nouveaux devis en envoyant les paramètres avec la méthode GET NEW_RATE. Vous devez spécifier les tickers et les réseaux des deux jetons pour réussir à générer des taux, ainsi que le montant.
Utilisez l'ID du taux fourni avec les taux pour créer une nouvelle transaction en utilisant la méthode NEW_TRADE. Vous devez indiquer la devise et le type de taux choisis (flottant ou fixe). Si vous souhaitez créer un paiement à taux fixe, envoyez également cette variable via la demande API.
Transmettez les données à l'utilisateur, afin qu'il puisse envoyer ses jetons à l'adresse du fournisseur.
Points d'accès :
https://api.trocador.app/
GET method coins
Cette méthode renvoie tous les jetons répertoriés dans notre base de données, avec leurs noms, leurs tickers, leurs réseaux et leurs montants minimum et maximum. Vous pouvez utiliser cette méthode pour alimenter votre base de données, et vous devez utiliser ces tickers et réseaux lorsque vous créez des transactions.


Paramètres :

Exemples :
- https://api.trocador.app/coins

Résultats :
- name: nom du jeton;
- ticker: ticker du jeton;
- network: réseau du jeton;
- memo: si le jeton utilise memo/ExtraID. Vrai ou Faux;
- image: icône du jeton;
- minimum: montant minimum qui peut être négocié;
- maximum: montant maximum qui peut être négocié;
GET method coin
Cette méthode renvoie toutes les données des jetons qui ont le nom ou le ticker spécifié. Si plusieurs jetons ont le même ticker, la méthode renvoie une liste de tous les jetons. Au moins un ticker ou un nom est obligatoire.


Paramètres :
- ticker: le ticker du jeton que vous voulez récupérer, par exemple btc (facultatif);
- name: le nom du jeton que vous voulez récupérer, par exemple Bitcoin (facultatif);

Exemples :
- https://api.trocador.app/coin?ticker=btc
- https://api.trocador.app/coin?name=Bitcoin

Résultats :
- name: nom du jeton;
- ticker: ticker du jeton;
- network: réseau du jeton;
- memo: si le jeton utilise memo/ExtraID. Vrai ou Faux;
- image: icône du jeton;
- minimum: montant minimum à négocier;
- maximum: montant maximum à négocier;
GET method trade
Cette méthode renvoie une transaction spécifique ayant l'ID fourni dans la demande. Ceci peut être utilisé pour montrer à l'utilisateur le statut actualisé de la transaction. Cela n'est possible que si l'utilisateur n'a pas encore demandé à effacer la transaction de la base de données, ou si la transaction a moins de 14 jours, sinon le système l'aura supprimée.


Paramètres :
- id: la chaîne ou le numéro d'identification de la transaction (facultatif);

Exemples :
- https://api.trocador.app/trade?id=ID

Résultats :
- trade_id: l'identification de la transaction avec nous;
- date: date et heure de création;
- ticker_from: ticker du jeton à vendre;
- ticker_to: ticker du jeton à acheter;
- coin_from: nom du jeton à vendre;
- coin_to: nom du jeton à acheter;
- network_from: réseau du jeton à vendre;
- network_to: réseau du jeton à acheter;
- amount_from: montant du jeton à vendre;
- amount_to: montant du jeton à acheter;
- provider: échange choisi;
- fixed: Vrai si taux fixe ou Faux si taux flottant;
- status: statut du trade;
- address_provider: adresse de l'échange;
- address_provider_memo: memo/ExtraID de l'adresse de l'échange;
- address_user: adresse pour recevoir les pièces achetées;
- address_user_memo: memo/ExtraID de l'adresse pour recevoir les jetons achetées;
- refund_address: adresse à laquelle recevoir un remboursement si nécessaire;
- refund_address_memo: memo/ExtraID de l'adresse à laquelle recevoir un remboursement si nécessaire;
- password: mot de passe utilisé avec l'id_provider afin de voir la transaction sur le site web de l'échange, utilisé uniquement par certains fournisseurs.;
- id_provider: l'ID du trade avec le fournisseur;
- quotes:
 support: données de support de l'échange;
 expiresAt: heure et date d'expiration de l'échange;
- details:
 hashout: hash de la transaction de paiement. Disponible uniquement lorsque le trade est terminé;
- payment: True ou False, selon s'il s'agit d'un échange ou d'un paiement standard;
GET method validateaddress
Cette méthode vérifie si une adresse donnée peut être utilisée avec un certain jeton. Si vous ne voulez pas vérifier chaque adresse, ce n'est pas nécessaire, puisque le système effectue toujours cette vérification avant de créer une transaction. Cette fonction renvoie True ou False selon que l'adresse fournie correspond au jeton et au réseau donnés.


Paramètres :
- ticker: le ticker du jeton que vous voulez tester, par exemple btc (Obligatoire);
- network: le réseau du jeton que vous voulez tester, par exemple Mainnet (Obligatoire);
- address: l'adresse du jeton que vous voulez tester (Obligatoire);

Exemples :
- https://api.trocador.app/validateaddress?ticker=&network=&address=

Résultats :
- result: Vrai si l'adresse est valide ou Faux dans le cas contraire.;
GET method new_rate
Cette méthode génère une liste de taux de tous les fournisseurs et les organise du meilleur au pire taux. Les taux sont accompagnés du score KYC de chaque échange, de A (pas de KYC) à D (peut retenir les fonds de l'utilisateur indéfiniment jusqu'à vérification). Cette méthode renvoie un identifiant unique que vous devez utiliser si vous souhaitez créer une transaction.


Paramètres :
- ticker_from: le ticker du jeton que vous voulez vendre, par exemple btc (obligatoire);
- network_from: le réseau du jeton que vous voulez vendre, par exemple Mainnet (Obligatoire);
- ticker_to: le ticker du jeton que vous voulez acheter, par exemple xmr (Obligatoire);
- network_to: le réseau du jeton que vous voulez acheter, par exemple Mainnet (Obligatoire);
- amount_from or amount_to: le montant de la pièce que vous souhaitez vendre ou recevoir (amount_from est obligatoire pour les swaps standard, tandis que amount_to est obligatoire pour les paiements);
- payment: True ou False, selon si vous souhaitez créer un paiement à taux fixe ou un swap standard (facultatif);
- min_kycrating: si vous souhaitez évaluer un jeton uniquement sur les échanges avec un minimum de notation KYC A, B, C ou D, veuillez fournir ce paramètre (facultatif);
- min_logpolicy: Si vous souhaitez évaluer un jeton uniquement sur les échanges avec un minimum de notation de politique de journalisation A, B ou C, veuillez fournir ce paramètre (facultatif);
- markup: Nous permettons aux partenaires de spécifier leur propre commission, en pourcentage (facultatif); il doit être soit 0, 1, 1,65 ou 3 (en tant que %); si le partenaire fournit markup = 0 ou ne fournit pas ce paramètre du tout, Trocador partagera la moitié de sa commission avec le partenaire; sachez qu'en définissant une majoration > 0, l'utilisateur final se verra proposer des taux moins avantageux, de sorte que les prix augmenteront par rapport à ceux proposés sur Trocador;
- best_only: Si vous souhaitez uniquement connaître le meilleur taux pour les paramètres fournis, mettez True (facultatif);

Exemples :
- https://api.trocador.app/new_rate?ticker_from=&ticker_to=&network_from=&network_to=&amount_from=

Résultats :
- trade_id: l'identification de la transaction avec nous;
- date: date et heure de création;
- ticker_from: ticker du jeton à vendre;
- ticker_to: ticker du jeton à acheter;
- coin_from: nom du jeton à vendre;
- coin_to: nom du jeton à acheter;
- network_from: réseau du jeton à vendre;
- network_to: réseau du jeton à acheter;
- amount_from: montant du jeton à vendre;
- amount_to: montant du jeton à acheter;
- provider: échange avec le meilleur taux;
- fixed: type de taux pour le meilleur taux, True pour fixe et False pour flottant;
- status: statut du trade;
- quotes: liste de toutes les autres devis générés, avec leur notation KYC et leur gaspillage (spread) en pourcentage;
- payment: True ou False, selon s'il s'agit d'un échange ou d'un paiement standard;
GET method new_trade
Cette méthode crée une transaction avec l'ID fourni, sur le type de change et de taux sélectionné. Il renvoie l'adresse du fournisseur d'échange, où l'utilisateur doit envoyer ses jetons afin de recevoir le montant demandé.


Paramètres :
- id: le numéro d'identification du taux précédemment généré (facultatif); si le partenaire ne fournit pas l'ID d'un nouveau taux précédemment généré, la transaction sera alors générée avec le meilleur taux trouvé parmi les paramètres restants, comme s'il avait été créé avec le paramètre best_only de la méthode new_rate;
- ticker_from: le ticker du jeton que vous voulez vendre, par exemple btc (obligatoire);
- network_from: le réseau du jeton que vous voulez vendre, par exemple Mainnet (Obligatoire);
- ticker_to: le ticker du jeton que vous voulez acheter, par exemple xmr (Obligatoire);
- network_to: le réseau du jeton que vous voulez acheter, par exemple Mainnet (Obligatoire);
- amount_from or amount_to: le montant de la pièce que vous souhaitez vendre ou recevoir (amount_from est obligatoire pour les swaps standard, tandis que amount_to est obligatoire pour les paiements);
- address: l'adresse où l'utilisateur veut recevoir ses jetons (Obligatoire);
- address_memo: le mémo / ExtraID de l'adresse où l'utilisateur souhaite recevoir ses jetons (obligatoire si le jeton reçu utilise memo / ExtraID - Utilisez '0' pour aucun mémo);
- refund: l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème (facultatif).;
- refund_memo: le memo / ExtraID de l'adresse où l'utilisateur souhaite recevoir ses jetons en retour en cas de problème (obligatoire si le remboursement est utilisé et que le jeton envoyé utilise memo / ExtraID - Utilisez '0' pour aucun mémo);
- provider: l'échange souhaité (Obligatoire);
- fixed: Vrai pour un taux fixe ou Faux pour un taux flottant (Obligatoire);
- payment: True ou False, selon si vous souhaitez créer un paiement à taux fixe ou un swap standard (facultatif);
- min_kycrating: si vous souhaitez évaluer un jeton uniquement sur les échanges avec un minimum de notation KYC A, B, C ou D, veuillez fournir ce paramètre (facultatif);
- min_logpolicy: Si vous souhaitez évaluer un jeton uniquement sur les échanges avec un minimum de notation de politique de journalisation A, B ou C, veuillez fournir ce paramètre (facultatif);
- webhook: Si vous fournissez une URL sur ce paramètre, chaque fois que le statut de la transaction change, vous recevrez sur cette URL une requête POST vous envoyant les données de la transaction ; cela évite d'appeler autant de fois notre serveur pour vérifier le statut de la transaction (facultatif);
- webhook_key: vous pouvez définir n'importe quelle chaîne ici pour être utilisée pour la validation du webhook de votre côté, afin que vous puissiez confirmer que la requête POST vient de nous (Optionnel);
- markup: Nous permettons aux partenaires de spécifier leur propre commission, en pourcentage (facultatif); il doit être soit 0, 1, 1,65 ou 3% ; si le partenaire fournit une majoration=0 ou ne fournit pas ce paramètre du tout, alors Trocador partagera la moitié de sa commission avec le partenaire; sachez qu'en fixant une marge > 0, l'utilisateur final se verra proposer des taux moins avantageux, donc les prix augmenteront par rapport à ceux proposés sur Trocador;

Exemples :
- https://api.trocador.app/new_trade?id=&ticker_from=&ticker_to=&network_to=&network_from=&amount_from=&address=&provider=&fixed=
- https://api.trocador.app/new_trade?id=&ticker_from=&ticker_to=&network_to=&network_from=&amount_from=&address=&provider=&fixed=&refund=

Résultats :
- trade_id: l'identification de la transaction avec nous;
- date: date de création;
- ticker_from: ticker du jeton à vendre;
- ticker_to: ticker du jeton à acheter;
- coin_from: nom du jeton à vendre;
- coin_to: nom du jeton à acheter;
- network_from: réseau du jeton à vendre;
- network_to: réseau du jeton à acheter;
- amount_from: montant du jeton à vendre;
- amount_to: montant du jeton à acheter;
- provider: échange choisi;
- fixed: Vrai si taux fixe ou Faux si taux flottant;
- status: statut du trade;
- address_provider: adresse de l'échange;
- address_provider_memo: memo/ExtraID de l'adresse de l'échange;
- address_user: adresse pour recevoir les pièces achetées;
- address_user_memo: memo/ExtraID de l'adresse pour recevoir les jetons achetées;
- refund_address: l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- refund_address_memo: mémo / ExtraID de l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- password: mot de passe utilisé avec l'id_provider afin de voir la transaction sur le site web de l'échange, utilisé uniquement par certains fournisseurs.;
- id_provider: l'ID du trade avec le fournisseur;
- payment: True ou False, selon s'il s'agit d'un échange ou d'un paiement standard;
GET method cards
Obtenez toutes les cartes prépayées disponibles à la vente. Vous pouvez désormais générer des revenus en vendant des cartes prépayées Visa et Mastercard en USD et EUR, que vos utilisateurs peuvent charger avec n'importe quel crypto de votre/leur choix. Pour obtenir la liste complète des cartes disponibles à la vente, utilisez cette méthode.


Paramètres :

Exemples :
- https://api.trocador.app/cards

Résultats :
- provider: la société qui livre la carte;
- currency_code: dans quelle devise la carte est libellée (USD, EUR, etc);
- brand: soit Visa soit Mastercard;
- amounts: liste des valeurs pour lesquelles la carte peut valoir;
- restricted_countries: liste des pays où la carte ne peut pas être utilisée (l'utilisation n'est pas garantie et peut entraîner le blocage de la carte);
- allowed_countries: liste des pays où la carte peut être utilisée;
Si la carte a une liste de pays restreints, alors d'autres pays en dehors de cette liste acceptent généralement la carte. L'inverse s'applique à la liste des pays autorisés. Si une carte a une liste de pays autorisés, alors l'utiliser en dehors de ceux-ci peut entraîner un dysfonctionnement de la carte ou son blocage.
GET method order_prepaidcard
Créez une commande pour acheter une carte prépayée. Nous partagerons 50% de nos revenus avec le partenaire qui vend une carte. Plus tard, pour obtenir le statut de votre achat, vous devez utiliser la méthode régulière 'trade' de ce système API. Les détails de la carte, tels que le lien d'activation, iront avec la réponse de la méthode 'trade'.


Paramètres :
- provider: le fournisseur de la carte que votre utilisateur souhaite acheter;
- currency_code: la devise fiduciaire de la carte que vous voulez acheter;
- ticker_from: le ticker du jeton que vous voulez utiliser pour le paiement (exemple, Bitcoin);
- network_from: le réseau du jeton que vous voulez utiliser pour le paiement (exemple, Mainnet);
- amount: la valeur en fiat de la carte que votre utilisateur souhaite acheter;
- email: l'e-mail qui recevra le code de rachat de la carte;
- webhook: Si vous fournissez une URL sur ce paramètre, chaque fois que le statut de la transaction change, vous recevrez sur cette URL une requête POST vous envoyant les données de la transaction ; cela évite d'appeler autant de fois notre serveur pour vérifier le statut de la transaction (facultatif);
- webhook_key: vous pouvez définir n'importe quelle chaîne ici pour être utilisée pour la validation du webhook de votre côté, afin que vous puissiez confirmer que la requête POST vient de nous (Optionnel);
- card_markup: la commission que vous souhaitez appliquer au-dessus de la carte, en pourcentage, pour vous-même ; valeurs disponibles de 1, 2 ou 3 ; si vous définissez ce paramètre, nous ne partagerons pas notre commission avec vous, à la place, vous recevrez la majoration complète (paramètre optionnel);

Exemples :
- https://api.trocador.app/order_prepaidcard/?currency_code=&provider=&ticker_from=&network_from=&amount=&email=

Résultats :
- trade_id: l'identification de la transaction avec nous;
- date: date de création;
- ticker_from: ticker du jeton à utiliser comme paiement;
- ticker_to: le jeton de règlement, généralement USDT;
- coin_from: nom du jeton à utiliser comme paiement;
- coin_to: le jeton de règlement, généralement Tether;
- network_from: réseau du jeton à utiliser comme paiement de la commande;
- network_to: réseau de règlement du jeton, généralement TRC20 (pour USDT);
- amount_from: montant du jeton à utiliser comme paiement;
- amount_to: montant de crypto du règlement au fournisseur (USDT);
- provider: échange choisi;
- fixed: true;
- status: statut du trade;
- address_provider: adresse de l'échange;
- address_provider_memo: memo/ExtraID de l'adresse de l'échange;
- address_user: adresse qui recevra le jeton de règlement pour traiter la génération de la carte;
- address_user_memo: memo/ExtraID de l'adresse pour recevoir les jetons achetées;
- refund_address: l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- refund_address_memo: mémo / ExtraID de l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- password: mot de passe utilisé avec l'id_provider afin de voir la transaction sur le site web de l'échange, utilisé uniquement par certains fournisseurs.;
- id_provider: l'ID du trade avec le fournisseur;
- details: données utiles concernant le rachat de la carte, telles que l'ID, la valeur en fiat, l'e-mail et le statut si la carte a déjà été envoyée ou si elle a échoué;
- payment: true;
GET method giftcards
Obtenez toutes les cartes-cadeaux disponibles à la vente. Vous pouvez maintenant générer des revenus en vendant des cartes-cadeaux de divers vendeurs à travers le monde. Vérifiez les cartes disponibles par pays : si vous ne fournissez pas le pays, une liste générale avec ID et nom sera fournie. Si vous fournissez le paramètre pays, alors tous les détails des cartes seront inclus dans la réponse.


Paramètres :

Exemples :
- https://api.trocador.app/giftcards?country=

Résultats :
- name: la société qui livre la carte;
- category: catégorie de la carte;
- description: description de la carte;
- terms_and_conditions: termes et conditions de la carte;
- how_to_use: un guide rapide;
- expiry_and_validity: date d'expiration;
- card_image_url: image de la carte;
- country: pays où la carte est supposée être dépensée;
- min_amount: valeur minimale de la carte en monnaie locale;
- max_amount: valeur maximale de la carte en monnaie locale;
- denominations: une liste de valeurs possibles de la carte en monnaie locale;
- product_id: l'ID de la carte (utilisez cet ID pour générer des commandes);
GET method order_giftcard
Créer une commande pour acheter une carte-cadeau. Nous partagerons 50% de nos revenus avec le partenaire qui vend une carte. Plus tard, pour obtenir le statut de votre achat, vous devez utiliser la méthode régulière 'trade' de ce système API. Les détails de la carte, tels que le lien d'activation, iront avec la réponse de la méthode 'trade'.


Paramètres :
- product_id: l'ID de la carte que votre utilisateur souhaite acheter;
- ticker_from: le ticker du jeton que vous voulez utiliser pour le paiement (exemple, Bitcoin);
- network_from: le réseau du jeton que vous voulez utiliser pour le paiement (exemple, Mainnet);
- amount: la valeur en fiat de la carte que votre utilisateur souhaite acheter;
- email: l'e-mail qui recevra le code de rachat de la carte;
- webhook: Si vous fournissez une URL sur ce paramètre, chaque fois que le statut de la transaction change, vous recevrez sur cette URL une requête POST vous envoyant les données de la transaction ; cela évite d'appeler autant de fois notre serveur pour vérifier le statut de la transaction (facultatif);
- webhook_key: vous pouvez définir n'importe quelle chaîne ici pour être utilisée pour la validation du webhook de votre côté, afin que vous puissiez confirmer que la requête POST vient de nous (Optionnel);
- card_markup: la commission que vous souhaitez appliquer au-dessus de la carte, en pourcentage, pour vous-même ; valeurs disponibles de 1, 2 ou 3 ; si vous définissez ce paramètre, nous ne partagerons pas notre commission avec vous, à la place, vous recevrez la majoration complète (paramètre optionnel);

Exemples :
- https://api.trocador.app/order_giftcard/?product_id=&ticker_from=&network_from=&amount=&email=

Résultats :
- trade_id: l'identification de la transaction avec nous;
- date: date de création;
- ticker_from: ticker du jeton à utiliser comme paiement;
- ticker_to: la crypto de règlement;
- coin_from: nom du jeton à utiliser comme paiement;
- coin_to: la crypto de règlement;
- network_from: réseau du jeton à utiliser comme paiement de la commande;
- network_to: réseau de règlement de la pièce;
- amount_from: montant du jeton à utiliser comme paiement;
- amount_to: montant de la crypto du règlement au fournisseur;
- provider: échange choisi;
- fixed: true;
- status: statut du trade;
- address_provider: adresse de l'échange;
- address_provider_memo: memo/ExtraID de l'adresse de l'échange;
- address_user: adresse qui recevra le jeton de règlement pour traiter la génération de la carte;
- address_user_memo: memo/ExtraID de l'adresse pour recevoir les jetons achetées;
- refund_address: l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- refund_address_memo: mémo / ExtraID de l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- password: mot de passe utilisé avec l'id_provider afin de voir la transaction sur le site web de l'échange, utilisé uniquement par certains fournisseurs.;
- id_provider: l'ID du trade avec le fournisseur;
- details: données utiles concernant le rachat de la carte, telles que l'ID, la valeur en fiat, l'e-mail et le statut si la carte a déjà été envoyée ou si elle a échoué;
- payment: true;
GET method new_bridge
Cette méthode crée deux transactions Bridge avec Monero comme intermédiaire. Il renvoie l'adresse du fournisseur d'échange, où l'utilisateur doit envoyer ses jetons afin de recevoir le montant demandé. Le Monero Bridge est composé de deux transactions provenant d'échanges différents, avec un échange envoyant Monero à l'autre. L'adresse de remboursement du premier échange est l'adresse de remboursement de l'utilisateur, tandis que le deuxième échange n'a pas d'adresse de remboursement, mais cette deuxième adresse de remboursement peut être remplacée par un paramètre du partenaire.


Paramètres :
- ticker_from: le ticker du jeton que vous voulez vendre, par exemple btc (obligatoire);
- network_from: le réseau du jeton que vous voulez vendre, par exemple Mainnet (Obligatoire);
- ticker_to: le ticker du jeton que vous voulez acheter, par exemple xmr (Obligatoire);
- network_to: le réseau du jeton que vous voulez acheter, par exemple Mainnet (Obligatoire);
- amount_from or amount_to: le montant de la pièce que vous souhaitez vendre ou recevoir (amount_from est obligatoire pour les swaps standard, tandis que amount_to est obligatoire pour les paiements);
- address: l'adresse où l'utilisateur veut recevoir ses jetons (Obligatoire);
- address_memo: le mémo / ExtraID de l'adresse où l'utilisateur souhaite recevoir ses jetons (obligatoire si le jeton reçu utilise memo / ExtraID - Utilisez '0' pour aucun mémo);
- refund: l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème (facultatif).;
- refund_memo: le memo / ExtraID de l'adresse où l'utilisateur souhaite recevoir ses jetons en retour en cas de problème (obligatoire si le remboursement est utilisé et que le jeton envoyé utilise memo / ExtraID - Utilisez '0' pour aucun mémo);
- rates_only: Si réglé sur vrai, renvoie le taux estimé pour le Monero Bridge. Lorsqu'il est utilisé, aucune adresse n'a besoin d'être fournie.;
- webhook: Si vous fournissez une URL sur ce paramètre, chaque fois que le statut de la transaction change, vous recevrez sur cette URL une requête POST vous envoyant les données de la transaction ; cela évite d'appeler autant de fois notre serveur pour vérifier le statut de la transaction (facultatif);
- webhook_key: vous pouvez définir n'importe quelle chaîne ici pour être utilisée pour la validation du webhook de votre côté, afin que vous puissiez confirmer que la requête POST vient de nous (Optionnel);

Exemples :
- https://api.trocador.app/new_bridge/?ticker_from=&ticker_to=&network_from=&network_to=&amount_from=&address=&refund=

Résultats :
Premier échange :
- trade_id: l'identification de la transaction avec nous;
- date: date de création;
- ticker_from: ticker du jeton à vendre;
- ticker_to: xmr;
- coin_from: nom du jeton à vendre;
- coin_to: Monero;
- network_from: réseau du jeton à vendre;
- network_to: Mainnet;
- amount_from: montant du jeton à vendre;
- amount_to: montant de Monero à acheter;
- provider: échange choisi;
- fixed: Vrai si taux fixe ou Faux si taux flottant;
- status: statut du trade;
- address_provider: adresse de l'échange;
- address_provider_memo: memo/ExtraID de l'adresse de l'échange;
- address_user: adresse pour recevoir les pièces achetées;
- address_user_memo: '';
- refund_address: l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- refund_address_memo: mémo / ExtraID de l'adresse à laquelle l'utilisateur souhaite recevoir ses jetons en retour en cas de problème.;
- password: mot de passe utilisé avec l'id_provider afin de voir la transaction sur le site web de l'échange, utilisé uniquement par certains fournisseurs.;
- id_provider: l'ID du trade avec le fournisseur;
- payment: True ou False, selon s'il s'agit d'un échange ou d'un paiement standard;

Deuxième échange :
- trade_id: l'identification de la transaction avec nous;
- date: date de création;
- ticker_from: xmr;
- ticker_to: ticker du jeton à acheter;
- coin_from: Monero;
- coin_to: nom du jeton à acheter;
- network_from: Mainnet;
- network_to: réseau du jeton à acheter;
- amount_from: montant de Monero à vendre;
- amount_to: montant du jeton à acheter;
- provider: échange choisi;
- fixed: Vrai si taux fixe ou Faux si taux flottant;
- status: statut du trade;
- address_provider: adresse de l'échange;
- address_provider_memo: memo/ExtraID de l'adresse de l'échange;
- address_user: adresse pour recevoir les pièces achetées;
- address_user_memo: memo/ExtraID de l'adresse pour recevoir les jetons achetées;
- refund_address: Adresse de remboursement XMR de Trocador ou adresse de remboursement XMR du partenaire;
- refund_address_memo: '';
- password: mot de passe utilisé avec l'id_provider afin de voir la transaction sur le site web de l'échange, utilisé uniquement par certains fournisseurs.;
- id_provider: l'ID du trade avec le fournisseur;
- payment: True ou False, selon s'il s'agit d'un échange ou d'un paiement standard;
GET method exchanges
Liste de tous les échanges cryptographiques intégrés et leurs caractéristiques.


Exemples :
- https://api.trocador.app/exchanges/
Status
Ce sont tous les statuts d'échange possibles que vous trouverez lors de l'appel du système API Trocador.


- new: vous avez des taux, mais vous n'avez pas encore créé l'échange;
- waiting: vous avez créé l'échange mais aucun dépôt n'a été détecté;
- confirming: le dépôt a été détecté et doit encore être confirmé;
- sending: dépôt confirmé et le fournisseur envoie les jetons;
- paid partially: l'utilisateur a déposé moins que le montant requis. Utilisé uniquement pour AnonPay, Cartes et contrôles AML;
- finished: il y a déjà un hash de paiement à l'utilisateur;
- failed: quelque chose s'est peut-être passé avec l'échange, veuillez contacter le support;
- expired: le temps de paiement a expiré;
- halted: un problème est survenu avec l'échange, veuillez contacter le support;
- refunded: l'échange prétend avoir remboursé l'utilisateur;