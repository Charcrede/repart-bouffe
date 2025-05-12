"use client"
import { useState, useEffect, JSX } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { DateRange, RangeKeyDict, Range } from 'react-date-range';
import { format, eachDayOfInterval, getDay, startOfWeek, addWeeks, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Moon, Sun, Calendar, DollarSign, ChevronsUpDown } from 'lucide-react';
// Import styles dynamically in client component only
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useHasMounted } from '@/lib/useHasMounted';

// Types
type DayName = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
type CostsMap = Record<DayName, number>;
type DataRow = {
  day: DayName;
  count: number;
  cost: number;
  total: number;
};
type WeekDataRow = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  count: number;
  cost: number;
  total: number;
};
type ResultData = {
  data: DataRow[];
  weekData: WeekDataRow[];
  total: number;
  totalDays: number;
  totalWeeks: number;
};

type Currency = {
  code: string;
  name: string;
  symbol: string;
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

// Liste des devises disponibles
const currencies: Currency[] = [
  { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'FCFA' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'Dollar américain', symbol: '$' },
  { code: 'GBP', name: 'Livre sterling', symbol: '£' },
  { code: 'CAD', name: 'Dollar canadien', symbol: 'CA$' },
  { code: 'MAD', name: 'Dirham marocain', symbol: 'DH' },
  { code: 'DZD', name: 'Dinar algérien', symbol: 'DA' },
  { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA' },
];

// Composant pour le sélecteur de thème
function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const hasMounted = useHasMounted();
  
  // Ne rien afficher tant que le composant n'est pas monté côté client
  if (!hasMounted) {
    return <div className="h-10 w-28"></div>; // Placeholder pour éviter les sauts
  }
  
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
}

// Composant principal
const Home = (): JSX.Element => {
  const hasMounted = useHasMounted();
  
  // Initialiser les états après le montage côté client
  const [range, setRange] = useState<Range[]>([{
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection',
  }]);
  
  const [costs, setCosts] = useState<CostsMap>(defaultCosts);
  const [customCostsEnabled, setCustomCostsEnabled] = useState<boolean>(false);
  const [defaultWorkdayCost, setDefaultWorkdayCost] = useState<number>(0);
  const [defaultWeekendCost, setDefaultWeekendCost] = useState<number>(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [currency, setCurrency] = useState<Currency>(currencies[0]);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState<boolean>(false);

  // Effectuer les calculs uniquement lorsque les dépendances changent ET que nous sommes côté client
  useEffect(() => {
    if (hasMounted) {
      calculate();
    }
  }, [hasMounted, range, costs, defaultWorkdayCost, defaultWeekendCost, customCostsEnabled]);

  const calculate = (): void => {
    // Vérifier si toutes les données nécessaires sont disponibles
    if (!range || range.length === 0) return;
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

      // Pour le calcul par semaine
      const weeks: Map<number, { days: Date[], total: number }> = new Map();
      let weekCounter = 0;
      let currentWeekStart = startOfWeek(range[0].startDate, { weekStartsOn: 1 }); // Commence le lundi

      days.forEach((day) => {
        const dayIndex = getDay(day);
        const dayName = daysMap[dayIndex] as DayName;
        counts[dayName] += 1;

        // Déterminer la semaine pour ce jour
        if (!isSameWeek(day, currentWeekStart, { weekStartsOn: 1 })) {
          weekCounter++;
          currentWeekStart = startOfWeek(day, { weekStartsOn: 1 });
        }

        // Ajouter le jour à la semaine correspondante
        if (!weeks.has(weekCounter)) {
          weeks.set(weekCounter, { days: [], total: 0 });
        }
        weeks.get(weekCounter)?.days.push(day);

        // Calculer le coût pour ce jour et l'ajouter au total de la semaine
        const cost = customCostsEnabled 
          ? costs[dayName] 
          : ['samedi', 'dimanche'].includes(dayName) 
            ? defaultWeekendCost 
            : defaultWorkdayCost;
        
        if (weeks.has(weekCounter)) {
          const weekData = weeks.get(weekCounter)!;
          weekData.total += cost;
        }
      });

      // Données par jour
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

      // Données par semaine
      const weekData: WeekDataRow[] = Array.from(weeks.entries()).map(([weekNumber, weekInfo]) => {
        const weekDays = weekInfo.days;
        if (weekDays.length === 0) return null;

        const startDate = weekDays[0];
        const endDate = weekDays[weekDays.length - 1];
        const dailyCosts = weekDays.map(day => {
          const dayIndex = getDay(day);
          const dayName = daysMap[dayIndex] as DayName;
          return customCostsEnabled 
            ? costs[dayName] 
            : ['samedi', 'dimanche'].includes(dayName) 
              ? defaultWeekendCost 
              : defaultWorkdayCost;
        });
        
        const total = dailyCosts.reduce((sum, cost) => sum + cost, 0);
        const avgCost = weekDays.length > 0 ? total / weekDays.length : 0;

        return {
          weekNumber: weekNumber + 1, // Pour affichage humain (commencer à 1)
          startDate,
          endDate,
          count: weekDays.length,
          cost: avgCost,
          total,
        };
      }).filter(Boolean) as WeekDataRow[];
      
      const totalCost = data.reduce((sum, d) => sum + d.total, 0);
      const totalDays = days.length;
      setResult({ 
        data, 
        weekData, 
        total: totalCost, 
        totalDays,
        totalWeeks: weekData.length,
      });
    } catch (error) {
      console.error("Erreur lors du calcul:", error);
    }
  };

  const handleCostChange = (day: DayName, value: string): void => {
    const numValue = Number(value.charAt(0) === "0" && value.length > 1 ? value.substring(1) : value);
    setCosts({ ...costs, [day]: numValue });
  };

  const handleRangeChange = (item: RangeKeyDict): void => {
    setRange([item.selection]);
  };

  const handleCurrencyChange = (curr: Currency): void => {
    setCurrency(curr);
    setCurrencyDropdownOpen(false);
  };

  // CSS personnalisé pour retirer les flèches des inputs number
  const noSpinnerStyle = `
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `;

  // Ne pas rendre le contenu côté serveur
  if (!hasMounted) {
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
      <style>{noSpinnerStyle}</style>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200 transition-colors">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h1 className="font-inter flex items-center gap-2 uppercase text-2xl md:text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text">
                <img src="/logo.png" alt="logo" className="w-16" />
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
                <DateRange
                  editableDateInputs={true}
                  onChange={handleRangeChange}
                  moveRangeOnFirstSelection={false}
                  ranges={range}
                  locale={fr}
                />
              </div>
            </div>

            {/* Cost configuration panel */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign size={20} className="text-indigo-500 dark:text-indigo-400" />
                  Configuration des coûts
                </h2>
                
                {/* Currency selector */}
                <div className="relative">
                  <button 
                    onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <span>{currency.symbol}</span>
                    <ChevronsUpDown size={16} />
                  </button>
                  
                  {currencyDropdownOpen && (
                    <div className="absolute right-0 mt-2 py-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-100 dark:border-gray-700">
                      {currencies.map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => handleCurrencyChange(curr)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
                        >
                          <span>{curr.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">{curr.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
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

              {customCostsEnabled ? (
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
                          {currency.symbol}
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
                            setDefaultWorkdayCost(0);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 outline-none transition-all"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                        {currency.symbol}
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
                            setDefaultWeekendCost(0);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 outline-none transition-all"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                        {currency.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results tables */}
          {result && range.length > 0 && range[0].startDate && range[0].endDate && (
            <div className="space-y-8 mt-8">
              {/* Table by day */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Dépenses par jour du {format(range[0].startDate, 'dd/MM/yyyy')} au {format(range[0].endDate, 'dd/MM/yyyy')}
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
                          <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-center">{row.cost.toLocaleString()} {currency.symbol}</td>
                          <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-right font-medium">{row.total.toLocaleString()} {currency.symbol}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                        <td colSpan={3} className="py-3 px-4 text-right font-bold">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{result.total.toLocaleString()} {currency.symbol}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Table by week */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Dépenses par semaine
                  </h2>
                  <div className="mt-2 md:mt-0 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium text-sm">
                    Total: {result.totalWeeks} semaine{result.totalWeeks > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="py-3 px-4 text-left font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Semaine</th>
                        <th className="py-3 px-4 text-center font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Nombre de jours</th>
                        <th className="py-3 px-4 text-center font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Montant unitaire moyen</th>
                        <th className="py-3 px-4 text-right font-semibold text-sm border-b border-gray-200 dark:border-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.weekData.map((row) => (
                        <tr key={row.weekNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 font-medium">
                            Semaine {row.weekNumber} 
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {format(row.startDate, 'dd/MM')} - {format(row.endDate, 'dd/MM')}
                            </div>
                          </td>
                          <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-center">{row.count}</td>
                          <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-center">{row.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency.symbol}</td>
                          <td className="py-3 px-4 border-b border-gray-100 dark:border-gray-700 text-right font-medium">{row.total.toLocaleString()} {currency.symbol}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                        <td colSpan={3} className="py-3 px-4 text-right font-bold">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{result.total.toLocaleString()} {currency.symbol}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
};

export default Home;