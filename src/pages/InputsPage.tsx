import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MarketDetailsTab from '../components/inputs/tabs/MarketDetailsTab';
import BaselineVolumeTab from '../components/inputs/tabs/BaselineVolumeTab';
import PostLOEImpactTab from '../components/inputs/tabs/PostLOEImpactTab';
import CostInputsTab from '../components/inputs/tabs/CostInputsTab';

export default function InputsPage() {
  const [activeTab, setActiveTab] = useState('market');
  const { state, updateDrug } = useApp();
  const scenario = state.activeScenario;
  const drug = state.scenarios[scenario].drug;

  return (
    <div className="h-full flex flex-col">
      {/* Scenario banner */}
      <div className={`px-4 lg:px-6 py-2.5 text-xs font-medium flex items-center gap-2 flex-shrink-0 border-b ${
        scenario === 'base'
          ? 'bg-accent/30 border-primary/15 text-primary'
          : 'bg-destructive/5 border-destructive/15 text-destructive'
      }`}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M7 4v3.5M7 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Editing: <strong>{scenario === 'base' ? 'Base Case' : 'Alternate Case'}</strong>
        <span className="text-muted-foreground hidden sm:inline">— Changes update the forecast immediately.</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-card border-b border-border flex-shrink-0 px-4 lg:px-6">
          <TabsList className="h-auto bg-transparent p-0 gap-0">
            {[
              { value: 'market', label: 'Market Details', num: 1 },
              { value: 'volume', label: 'Baseline Volume', num: 2 },
              { value: 'postloe', label: 'Post-LOE Impact', num: 3 },
              { value: 'costs', label: 'Cost Inputs', num: 4 },
            ].map((tab, idx) => {
              const tabOrder = ['market', 'volume', 'postloe', 'costs'];
              const currentIdx = tabOrder.indexOf(activeTab);
              const isPast = idx < currentIdx;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="relative flex items-center gap-2 px-4 py-4 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"
                >
                  <span className={`size-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                    activeTab === tab.value ? 'bg-primary text-primary-foreground'
                    : isPast ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    {isPast ? '✓' : tab.num}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.num}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="market" className="px-4 lg:px-6 py-6 mt-0">
            <MarketDetailsTab drug={drug} onChange={u => updateDrug(scenario, u)} onNext={() => setActiveTab('volume')} />
          </TabsContent>
          <TabsContent value="volume" className="px-4 lg:px-6 py-6 mt-0">
            <BaselineVolumeTab drug={drug} onChange={u => updateDrug(scenario, u)} onBack={() => setActiveTab('market')} onNext={() => setActiveTab('postloe')} />
          </TabsContent>
          <TabsContent value="postloe" className="px-4 lg:px-6 py-6 mt-0">
            <PostLOEImpactTab drug={drug} onChange={u => updateDrug(scenario, u)} onBack={() => setActiveTab('volume')} onNext={() => setActiveTab('costs')} />
          </TabsContent>
          <TabsContent value="costs" className="px-4 lg:px-6 py-6 mt-0">
            <CostInputsTab drug={drug} onChange={u => updateDrug(scenario, u)} onBack={() => setActiveTab('postloe')} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
