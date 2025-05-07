"use client"
import { useState, useEffect, JSX } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { DateRange, RangeKeyDict, Range } from 'react-date-range';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Moon, Sun, Calendar, DollarSign } from 'lucide-react';
import dynamic from 'next/dynamic';
// Import styles dynamically in client component only
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// Types
type DayName = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
type CostsMap = Record<DayName, number>;
type DataRow = {
  day: DayName;
  count: number;
  cost: number;
  total: number;
};
type ResultData = {
  data: DataRow[];
  total: number;
  totalDays: number;
};

const daysMap: string[] = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const defaultCosts: CostsMap = {
  lundi: 0,
  mardi: 0,
  mercredi: 0,
  jeudi: 0,
  vendredi: 0,
  samedi: 0,
  dimanche: 0,
};

// Composant pour le sélecteur de thème
function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white text-yellow-500 shadow-md' : 'text-gray-400'}`}
        aria-label="Thème clair"
      >
        <Sun size={20} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-gray-700 text-blue-400 shadow-md' : 'text-gray-400'}`}
        aria-label="Thème sombre"
      >
        <Moon size={20} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-full transition-all ${theme === 'system' ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white shadow-md' : 'text-gray-400'}`}
        aria-label="Thème système"
      >
        <span className="text-xs font-medium">Auto</span>
      </button>
    </div>
  );
};

// Rendre le composant uniquement côté client pour éviter les erreurs d'hydratation
const Home = (): JSX.Element => {
  // Utiliser useState avec valeurs par défaut nulles pour éviter les incohérences lors du rendu initial
  const [range, setRange] = useState<Range[]>([]);
  const [costs, setCosts] = useState<CostsMap | null>(null);
  const [customCostsEnabled, setCustomCostsEnabled] = useState<boolean>(false);
  const [defaultWorkdayCost, setDefaultWorkdayCost] = useState<number>(0);
  const [defaultWeekendCost, setDefaultWeekendCost] = useState<number>(0);
  const [result, setResult] = useState<ResultData | null>(null);
  // État pour traquer si le composant est monté côté client
  const [isClient, setIsClient] = useState<boolean>(false);

  // Initialiser les états une fois que le composant est monté côté client
  useEffect(() => {
    setIsClient(true);
    setRange([{
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    }]);
    setCosts(defaultCosts);
  }, []);

  // Effectuer les calculs uniquement lorsque les dépendances changent ET que nous sommes côté client
  useEffect(() => {
    if (isClient && range.length > 0 && costs) {
      calculate();
    }
  }, [isClient, range, costs, defaultWorkdayCost, defaultWeekendCost, customCostsEnabled]);

  const calculate = (): void => {
    // Vérifier si toutes les données nécessaires sont disponibles
    if (!range || range.length === 0 || !costs) return;
    if (!range[0]?.startDate || !range[0]?.endDate) return;

    try {
      const days = eachDayOfInterval({
        start: range[0].startDate,
        end: range[0].endDate,
      });

      const counts: Record<DayName, number> = {
        lundi: 0,
        mardi: 0,
        mercredi: 0,
        jeudi: 0,
        vendredi: 0,
        samedi: 0,
        dimanche: 0,
      };

      days.forEach((day) => {
        const dayIndex = getDay(day);
        const dayName = daysMap[dayIndex] as DayName;
        counts[dayName] += 1;
      });

      const data: DataRow[] = Object.entries(counts).map(([day, count]) => {
        const typedDay = day as DayName;
        const cost = customCostsEnabled 
          ? costs[typedDay] 
          : ['samedi', 'dimanche'].includes(typedDay) 
            ? defaultWeekendCost 
            : defaultWorkdayCost;
        
        return {
          day: typedDay,
          count,
          cost,
          total: cost * count,
        };
      });

      const totalCost = data.reduce((sum, d) => sum + d.total, 0);
      const totalDays = days.length;
      setResult({ data, total: totalCost, totalDays });
    } catch (error) {
      console.error("Erreur lors du calcul:", error);
    }
  };

  const handleCostChange = (day: DayName, value: string): void => {
    if (costs) {
      console.log("value", value);
      console.log("Number", Number(value.charAt(0) == "0" ? value.substring(1,value.length) : value));
      setCosts({ ...costs, [day]: Number(value.charAt(0) == "0" ? value.substring(1,value.length) : value) });
    }
  };

  const handleRangeChange = (item: RangeKeyDict): void => {
    setRange([item.selection]);
  };

  // Ne pas rendre le contenu côté serveur
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200 transition-colors">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h1 className="font-inter flex items-center gap-2 uppercase text-2xl md:text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text">
                <img src="/logo.png" alt="logo" className='w-16' />
                Calculateur de dépenses
              </h1>
            </div>
            <ThemeToggle />
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Date selection panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 h-min w-fit">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500 dark:text-indigo-400" />
                Sélection de dates
              </h2>
              <div className="rdrCalendarWrapper rounded-lg overflow-hidden">
                {range.length > 0 && (
                  <DateRange
                    editableDateInputs={true}
                    onChange={handleRangeChange}
                    moveRangeOnFirstSelection={false}
                    ranges={range}
                    locale={fr}
                  />
                )}
              </div>
            </div>

            {/* Cost configuration panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-indigo-500 dark:text-indigo-400" />
                Configuration des coûts
              </h2>
              
              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={customCostsEnabled} 
                    onChange={() => setCustomCostsEnabled(!customCostsEnabled)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition ${customCostsEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${customCostsEnabled ? 'translate-x-6' : 'translate-x-1'} translate-y-0.5`}></div>
                  </div>
                </div>
                <span>Utiliser des coûts personnalisés par jour</span>
              </label>

              {customCostsEnabled && costs ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-2 gap-3 mt-4">
                  {(Object.keys(costs) as DayName[]).map((day) => (
                    <div key={day} className="flex flex-col">
                      <label className="text-sm font-medium capitalize mb-1">{day}</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={costs[day]}
                          onChange={(e) => {handleCostChange(day, e.target.value)}}
                          onFocus={(e) => {
                            if (e.target.value === "0") {
                              e.target.value = "";
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              handleCostChange(day, "0");
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 outline-none transition-all"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                          FCFA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">Coût pour les jours ouvrables (lundi à vendredi)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={defaultWorkdayCost}
                        onChange={(e) => setDefaultWorkdayCost(Number(e.target.value))}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setDefaultWorkdayCost(Number(e.target.value))
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 outline-none transition-all"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                        FCFA
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">Coût pour le weekend (samedi et dimanche)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={defaultWeekendCost}
                        onChange={(e) => setDefaultWeekendCost(Number(e.target.value))}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setDefaultWeekendCost(Number(e.target.value))
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 outline-none transition-all"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                        FCFA
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results table */}
          {result && range.length > 0 && range[0].startDate && range[0].endDate && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Dépenses du {format(range[0].startDate, 'dd/MM/yyyy')} au {format(range[0].endDate, 'dd/MM/yyyy')}
                </h2>
                <div className="mt-2 md:mt-0 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium text-sm">
                  Période: {result.totalDays} jour{result.totalDays > 1 ? 's' : ''}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="py-3 px-4 text-left font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Jour</th>
                      <th className="py-3 px-4 text-center font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Nombre d'apparitions</th>
                      <th className="py-3 px-4 text-center font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Montant unitaire</th>
                      <th className="py-3 px-4 text-right font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row) => (
                      <tr key={row.day} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 capitalize font-medium">{row.day}</td>
                        <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-center">{row.count}</td>
                        <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-center">{row.cost.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-right font-medium">{row.total.toLocaleString()} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                      <td colSpan={3} className="py-3 px-4 text-right font-bold">Total</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{result.total.toLocaleString()} FCFA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          <footer className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Calculateur de dépenses - Tous droits réservés
          </footer>
        </div>
      </main>
    </ThemeProvider>
  );
}
export default dynamic(() => Promise.resolve(Home), { ssr: false });