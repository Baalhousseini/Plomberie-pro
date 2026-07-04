export type Role = 'tech' | 'dispatch' | 'secretaire' | 'patron'

export type InterventionType =
  | "Fuite d'eau"
  | 'Débouchage'
  | 'Remplacement chaudière'
  | 'Installation sanitaire'
  | 'Rénovation salle de bain'
  | 'Installation VMC'
  | 'Travaux urgents'
  | 'Autre'

export type RdvStatut = 'A planifier' | 'Planifie' | 'En cours' | 'Termine' | 'Annule'
export type RapportStatut = 'En attente validation' | 'Valide' | 'Refuse' | 'Facture' | 'Paye'
export type FactureStatut = 'Impaye' | 'Paye' | 'Annule'

export interface User {
  id: string
  nom: string
  role: Role
  actif: boolean
}

export interface Rdv {
  id: string
  clientNom: string
  clientTel: string
  adresse: string
  type: InterventionType
  date: string
  heure: string
  technicienId: string | null
  technicienNom?: string
  statut: RdvStatut
  mandant?: string
  notes?: string
  createdAt: string
  createdBy: string
  urgence?: boolean
}

export interface VenteItem {
  label: string
  prixVente: number
}

export interface Rapport {
  id: string
  rdvId: string
  technicienId: string
  technicienNom: string
  clientNom: string
  clientTel: string
  adresse: string
  type: InterventionType
  date: string
  heureDebut: string
  heureFin: string
  description: string
  pieces: string[]
  piecesNotes?: string
  ventes: VenteItem[]
  montantFinal: number
  modeEncaissement: string
  signature?: string
  photosAvant: string[]
  photosApres: string[]
  satisfaction?: number
  retourRequis?: string
  mandant?: string
  statut: RapportStatut
  soumisLe: string
  valideAt?: string
  valideBy?: string
  commentairePatron?: string
  facturRef?: string
}

export interface Facture {
  id: string
  ref: string
  rapportId?: string
  clientNom: string
  clientTel?: string
  adresse?: string
  technicienNom?: string
  dateIntervention?: string
  dateFacture: string
  montantHT: number
  tva: number
  montantTTC: number
  description?: string
  pieces?: string[]
  ventes?: VenteItem[]
  statut: FactureStatut
  modeEncaissement?: string
  createdAt: string
}

export const INTERVENTION_TYPES: InterventionType[] = [
  "Fuite d'eau",
  'Débouchage',
  'Remplacement chaudière',
  'Installation sanitaire',
  'Rénovation salle de bain',
  'Installation VMC',
  'Travaux urgents',
  'Autre',
]

export const INTERVENTION_CONFIG: Record<InterventionType, {
  icon: string
  objet: string
  steps: string[]
  normes: string
  garantie: string
  color: string
}> = {
  "Fuite d'eau": {
    icon: '💧',
    objet: 'Détection et réparation de fuite sur réseau eau',
    color: '#0369a1',
    steps: [
      'Inspection visuelle du réseau alimentation et évacuation',
      'Test de pression — localisation précise de la fuite',
      'Réparation / remplacement tronçon, joint ou raccord défectueux',
      'Remise en pression du réseau',
      "Vérification d'étanchéité (maintien pression 30 min minimum)",
      'Contrôle des dommages éventuels sur parois et plafonds',
    ],
    normes: 'NF EN 806-4 · DTU 60.1',
    garantie: "1 an pièces et main d'œuvre",
  },
  'Débouchage': {
    icon: '🔩',
    objet: 'Débouchage et nettoyage de canalisation',
    color: '#7c3aed',
    steps: [
      'Inspection visuelle — identification du bouchon / obstruction',
      'Débouchage mécanique au furet électrique',
      'Hydrocurage haute pression si nécessaire',
      "Vérification du bon écoulement en aval sur l'ensemble du réseau",
      'Test de charge hydraulique',
      'Désinfection si présence de matière organique',
    ],
    normes: 'DTU 60.11 · NF EN 12056',
    garantie: "3 mois sur l'intervention",
  },
  'Remplacement chaudière': {
    icon: '🔥',
    objet: 'Dépose ancienne chaudière et installation nouvelle unité',
    color: '#b45309',
    steps: [
      "Mise hors service et dépose de l'ancienne installation",
      'Vérification conformité du local technique (aération, accès)',
      'Pose et raccordement hydraulique du nouvel appareil',
      "Raccordement gaz avec contrôle d'étanchéité au détecteur",
      'Raccordement électrique et paramétrage',
      'Mise en service, purge circuit, réglage températures',
      'Test fonctionnement en cycle complet chauffage + ECS',
      "Remise livret d'entretien et documents de garantie constructeur",
    ],
    normes: 'NF EN 12828 · DTU 61.1 · RE2020',
    garantie: '2 ans constructeur + 1 an MO',
  },
  'Installation sanitaire': {
    icon: '🚿',
    objet: "Installation d'équipement sanitaire",
    color: '#0891b2',
    steps: [
      'Mise hors service alimentation eau (vanne de coupure)',
      "Préparation arrivées eau froide / eau chaude et évacuation",
      "Pose et fixation de l'équipement au support",
      "Raccordements alimentation et siphon évacuation",
      "Test d'étanchéité — pression maintenue 15 min minimum",
      'Remise en service et réglage du débit',
    ],
    normes: 'DTU 60.1 · DTU 60.11 · NF EN 200',
    garantie: "1 an pièces et main d'œuvre",
  },
  'Rénovation salle de bain': {
    icon: '🛁',
    objet: 'Rénovation complète salle de bain',
    color: '#be185d',
    steps: [
      'Dépose des équipements existants (baignoire, WC, lavabo…)',
      'Coupure alimentation eau et mise hors tension',
      "Mise à niveau arrivées d'eau et évacuations",
      'Pose des nouveaux équipements sanitaires',
      "Raccordements hydrauliques et vérification d'étanchéité",
      "Contrôle général de l'installation",
      'Nettoyage et remise en état du chantier',
    ],
    normes: 'DTU 60.1 · DTU 65.10 · NF C 15-100',
    garantie: "2 ans pièces et main d'œuvre",
  },
  'Installation VMC': {
    icon: '💨',
    objet: 'Installation Ventilation Mécanique Contrôlée',
    color: '#059669',
    steps: [
      'Étude du plan aéraulique du logement',
      "Pose bouches d'extraction (cuisine, SDB, WC)",
      'Installation groupe VMC en combles ou gaine technique',
      "Pose bouches d'entrée d'air autoréglables sur huisseries",
      'Raccordement électrique moto-ventilateur',
      'Réglage des débits réglementaires (arrêté 24/03/1982)',
      'Mesure et vérification des débits — test balométrique',
      "Remise notice d'entretien au client",
    ],
    normes: 'DTU 68.3 · NF EN 13141 · RE2020',
    garantie: '2 ans équipement + 1 an MO',
  },
  'Travaux urgents': {
    icon: '🚨',
    objet: 'Intervention urgente / dépannage',
    color: '#dc2626',
    steps: [
      'Diagnostic rapide sur site — identification de la cause',
      'Sécurisation de l\'installation (coupure eau / gaz si nécessaire)',
      'Intervention corrective d\'urgence',
      'Remise en état provisoire ou définitive selon constat',
      'Vérification bon fonctionnement post-intervention',
      'Préconisations pour éviter la récidive',
    ],
    normes: 'Selon nature des travaux réalisés',
    garantie: "3 mois sur l'intervention d'urgence",
  },
  'Autre': {
    icon: '🔧',
    objet: 'Intervention plomberie / chauffage / sanitaire',
    color: '#475569',
    steps: [
      'Diagnostic et évaluation sur site',
      'Intervention selon constat établi',
      'Vérification du bon fonctionnement',
      'Nettoyage du chantier',
    ],
    normes: 'Selon nature des travaux réalisés',
    garantie: "1 an main d'œuvre",
  },
}
