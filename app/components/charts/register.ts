// Chart.js v4 est modulaire : seuls les éléments enregistrés sont inclus (tree-shaking).
// On enregistre ici, une seule fois, tout ce dont nos graphes ont besoin.
// register() est idempotent : l'importer depuis plusieurs composants ne pose pas de souci.
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
