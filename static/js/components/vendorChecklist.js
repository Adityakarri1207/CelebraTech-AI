/**
 * Vendor Checklist & Directory Component for CelebraTech AI.
 * Handles supplier coordination, contract stages, quotes, and granular task checklists.
 */

const VendorChecklistComponent = {
  render(vendors, currency = "USD") {
    const container = document.getElementById("vendors-container");
    if (!container) return;

    if (!vendors || vendors.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-500">
          <p class="text-base font-medium text-slate-400">No vendors registered yet.</p>
          <p class="text-xs text-slate-600 mt-1">Add suppliers or ask AI to recommend vendor categories.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = vendors
      .map((vendor) => {
        const totalTasks = vendor.checklist_tasks?.length || 0;
        const completedCount = vendor.completed_tasks?.length || 0;
        const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

        const tasksHtml = (vendor.checklist_tasks || [])
          .map((task) => {
            const isDone = vendor.completed_tasks?.includes(task);
            return `
              <label class="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5">
                <input type="checkbox" ${isDone ? 'checked' : ''} onchange="App.toggleVendorTask('${vendor.id}', '${encodeURIComponent(task)}')" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700">
                <span class="text-xs ${isDone ? 'line-through text-slate-500' : 'text-slate-300'}">${task}</span>
              </label>
            `;
          })
          .join("");

        return `
          <div class="glass-panel p-5 rounded-2xl flex flex-col justify-between card-hover-lift">
            <div>
              <!-- Header -->
              <div class="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span class="text-[11px] font-semibold tracking-wider uppercase text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                    ${vendor.category}
                  </span>
                  <h3 class="text-base font-bold text-white mt-2">${vendor.name}</h3>
                </div>
                <button type="button" onclick="App.deleteVendor('${vendor.id}')" class="text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors" title="Delete vendor">
                  🗑️
                </button>
              </div>

              <!-- Status Dropdown & Quote -->
              <div class="flex items-center justify-between gap-2 my-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span class="text-[10px] text-slate-400 uppercase tracking-wider block">Quoted</span>
                  <span class="text-sm font-bold text-amber-300">
                    ${currency} ${Number(vendor.quoted_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span class="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Status</span>
                  <select onchange="App.updateVendorStatus('${vendor.id}', this.value)" class="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-purple-500 outline-none">
                    <option value="Researching" ${vendor.status === 'Researching' ? 'selected' : ''}>🔍 Researching</option>
                    <option value="Contacted" ${vendor.status === 'Contacted' ? 'selected' : ''}>📞 Contacted</option>
                    <option value="Quote Received" ${vendor.status === 'Quote Received' ? 'selected' : ''}>📄 Quote Received</option>
                    <option value="Contract Signed" ${vendor.status === 'Contract Signed' ? 'selected' : ''}>✍️ Contract Signed</option>
                    <option value="Deposit Paid" ${vendor.status === 'Deposit Paid' ? 'selected' : ''}>💳 Deposit Paid</option>
                    <option value="Fully Paid" ${vendor.status === 'Fully Paid' ? 'selected' : ''}>✅ Fully Paid</option>
                  </select>
                </div>
              </div>

              <!-- Task Progress Bar -->
              <div class="mb-3">
                <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Checklist Progress</span>
                  <span class="font-semibold text-slate-300">${completedCount}/${totalTasks} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
              </div>

              <!-- Checklist tasks -->
              <div class="space-y-1 mt-3">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Action Items:</span>
                ${tasksHtml || '<p class="text-xs text-slate-500 italic">No checklist items.</p>'}
              </div>
            </div>

            ${vendor.notes ? `
              <div class="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400">
                <span class="font-semibold text-slate-300">Notes:</span> ${vendor.notes}
              </div>
            ` : ''}
          </div>
        `;
      })
      .join("");
  },
};
