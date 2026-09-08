module.exports=[32447,e=>{"use strict";var t=e.i(89171),a=e.i(79832),i=e.i(43793),r=e.i(21475),n=e.i(44614),o=e.i(25694);async function s(e){try{let n=(await (0,a.requireAuth)(e)).userId,{searchParams:s}=e.nextUrl,d=new Date,l=r.periodQuerySchema.safeParse({month:s.get("month")||d.getMonth()+1,year:s.get("year")||d.getFullYear()}),_=l.success&&l.data.month?l.data.month:d.getMonth()+1,u=l.success&&l.data.year?l.data.year:d.getFullYear(),E=d.getDate(),[c,p,m,b,h,N,R,S,y,A,C]=await Promise.all([(0,i.query)(`SELECT * FROM wallets
           WHERE user_id = $1
           OR (is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))
           ORDER BY sort_order ASC, name ASC`,[n]),(0,i.query)("SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, name ASC",[n]),(0,i.query)(`SELECT
             t.id, t.user_id, t.type, t.amount, t.admin_fee,
             t.category_id, t.wallet_id, t.to_wallet_id,
             t.description, t.date, t.created_at, t.updated_at, t.edited_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             w1.name as wallet_name, w1.icon as wallet_icon,
             w2.name as to_wallet_name,
             CASE WHEN t.user_id = $1 THEN NULL ELSE u.name END as recorder_name
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
           LEFT JOIN wallets w1 ON t.wallet_id = w1.id AND (w1.user_id = $1 OR (w1.is_shared = TRUE AND w1.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           LEFT JOIN wallets w2 ON t.to_wallet_id = w2.id AND (w2.user_id = t.user_id OR (w2.is_shared = TRUE AND w2.household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)))
           LEFT JOIN users u ON t.user_id = u.id
           WHERE (
             t.user_id = $1
             OR t.wallet_id IN (
               SELECT id FROM wallets
                WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)
             )
           )
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           ORDER BY t.date DESC, t.created_at DESC`,[n,_,u]),(0,i.query)(`WITH latest_budgets AS (
             SELECT DISTINCT ON (category_id)
               id, user_id, category_id, monthly_limit, rollover_enabled, month, year, created_at
             FROM budgets
             WHERE user_id = $1
               AND (year < $3 OR (year = $3 AND month <= $2))
             ORDER BY category_id, year DESC, month DESC
           ),
           ${o.BUDGET_ROLLOVER_CTE}
           SELECT
             b.id, b.user_id, b.category_id, b.monthly_limit, $2::smallint as month, $3::smallint as year, b.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             (CASE WHEN COALESCE(b.rollover_enabled, FALSE) THEN COALESCE(pb.monthly_limit, 0) - COALESCE(ps.spent, 0) ELSE 0 END)::NUMERIC as rollover_amount,
             ${o.BUDGET_EFFECTIVE_LIMIT_SQL}::NUMERIC as effective_limit,
             COALESCE(SUM(t.amount), 0)::NUMERIC as spent,
             (${o.BUDGET_EFFECTIVE_LIMIT_SQL} - COALESCE(SUM(t.amount), 0))::NUMERIC as remaining,
             CASE
               WHEN ${o.BUDGET_EFFECTIVE_LIMIT_SQL} > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / ${o.BUDGET_EFFECTIVE_LIMIT_SQL} * 100)::NUMERIC, 1)::FLOAT
               ELSE 0
             END as percentage
           FROM latest_budgets b
           JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN prev_budgets pb ON pb.category_id = b.category_id
           LEFT JOIN prev_spent ps ON ps.category_id = b.category_id
           LEFT JOIN transactions t
             ON t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.user_id = b.user_id
             AND t.date >= make_date($3::int, $2::int, 1)
             AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
           GROUP BY b.id, b.user_id, b.category_id, b.monthly_limit, b.rollover_enabled, b.created_at,
                    c.name, c.icon, c.color, pb.monthly_limit, ps.spent
           ORDER BY percentage DESC, b.monthly_limit DESC`,[n,_,u]),(0,i.query)(`SELECT
             b.id, b.user_id, COALESCE(b.type, 'expense') as type, b.title, b.amount, b.due_day, b.category_id,
             b.wallet_id, b.to_wallet_id, b.debt_id, COALESCE(b.auto_record, FALSE) as auto_record, b.is_active, b.created_at,
             c.name as category_name,
             w.name as wallet_name,
             w2.name as to_wallet_name,
             d.person_name as debt_person_name,
             bp.id as payment_id, bp.paid_date,
             CASE WHEN bp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_paid
           FROM recurring_bills b
           LEFT JOIN categories c ON b.category_id = c.id AND c.user_id = b.user_id
           LEFT JOIN wallets w ON b.wallet_id = w.id AND w.user_id = b.user_id
           LEFT JOIN wallets w2 ON b.to_wallet_id = w2.id AND w2.user_id = b.user_id
           LEFT JOIN debts d ON b.debt_id = d.id AND d.user_id = b.user_id
           LEFT JOIN bill_payments bp
             ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
           WHERE b.user_id = $1 AND b.is_active = TRUE
           ORDER BY is_paid ASC, b.due_day ASC`,[n,_,u]),(0,i.query)("SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = $1 OR (is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1))",[n]),(0,i.query)(`SELECT
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
             COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense,
             COALESCE(SUM(CASE WHEN type='transfer' THEN amount ELSE 0 END), 0) as transfer,
             COALESCE(SUM(admin_fee), 0) as admin_total
           FROM transactions
           WHERE (
             user_id = $1
             OR wallet_id IN (
               SELECT id FROM wallets
                WHERE is_shared = TRUE AND household_id IN (SELECT household_id FROM household_members WHERE user_id = $1)
             )
           )
             AND date >= make_date($3::int, $2::int, 1)
             AND date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'`,[n,_,u]),(0,i.query)(`SELECT 
             COUNT(*)::text as count,
             COALESCE(SUM(b.amount), 0)::text as total_pending_amount
            FROM recurring_bills b
            LEFT JOIN bill_payments bp
              ON bp.bill_id = b.id AND bp.month = $2 AND bp.year = $3 AND bp.user_id = b.user_id
            WHERE b.user_id = $1 AND b.is_active = TRUE AND COALESCE(b.type, 'expense') = 'expense' AND bp.id IS NULL`,[n,_,u]),(0,i.query)(`SELECT COUNT(*)::text as count
           FROM (
             WITH latest_budgets AS (
               SELECT DISTINCT ON (category_id)
                 id, user_id, category_id, monthly_limit, rollover_enabled, month, year
               FROM budgets
               WHERE user_id = $1
                 AND (year < $3 OR (year = $3 AND month <= $2))
               ORDER BY category_id, year DESC, month DESC
             ),
             ${o.BUDGET_ROLLOVER_CTE}
             SELECT b.id, ${o.BUDGET_EFFECTIVE_LIMIT_SQL} AS effective_limit, COALESCE(SUM(t.amount), 0) AS spent
             FROM latest_budgets b
             LEFT JOIN prev_budgets pb ON pb.category_id = b.category_id
             LEFT JOIN prev_spent ps ON ps.category_id = b.category_id
             LEFT JOIN transactions t
               ON t.category_id = b.category_id AND t.type = 'expense'
               AND t.user_id = b.user_id
               AND t.date >= make_date($3::int, $2::int, 1)
               AND t.date < make_date($3::int, $2::int, 1) + INTERVAL '1 month'
             GROUP BY b.id, b.monthly_limit, b.rollover_enabled, pb.monthly_limit, ps.spent
           ) over_budgets
           WHERE over_budgets.spent > over_budgets.effective_limit`,[n,_,u]),(0,i.query)("SELECT * FROM app_settings WHERE user_id = $1",[n]),(0,i.query)(`SELECT
             id, user_id, type, category, person_name,
             total_amount::float AS total_amount,
             paid_amount::float AS paid_amount,
             (total_amount - paid_amount)::float AS remaining_amount,
             principal_amount::float AS principal_amount,
             interest_rate::float AS interest_rate,
             interest_type,
             tenor_months,
             monthly_installment::float AS monthly_installment,
            (SELECT COUNT(*) FROM recurring_bills rb WHERE rb.debt_id = debts.id AND rb.is_active = TRUE)::text AS active_bills_count,
             total_interest::float AS total_interest,
             start_date, due_date, notes, status,
             CASE
               WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
               ELSE NULL
             END AS days_until_due,
             CASE
               WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
               ELSE FALSE
             END AS is_overdue,
             CASE
                WHEN status != 'paid' AND (due_date IS NULL OR (due_date >= make_date($3::int, $2::int, 1) AND due_date < make_date($3::int, $2::int, 1) + INTERVAL '1 month')) THEN TRUE
               ELSE FALSE
             END AS is_due_this_period,
             created_at, updated_at
           FROM debts
           WHERE user_id = $1
           ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC`,[n,_,u])]),T=parseFloat(N[0]?.total||"0"),g=parseFloat(R[0]?.income||"0"),O=parseFloat(R[0]?.expense||"0")+parseFloat(R[0]?.admin_total||"0"),L=parseFloat(R[0]?.transfer||"0"),D=parseFloat(S[0]?.total_pending_amount||"0"),w=h.map(e=>{let t,a=!!e.is_paid,i=e.due_day-E;return t=a?"paid":i<0?"overdue":0===i?"due_today":i<=3?"due_soon":"upcoming",{id:e.id,user_id:e.user_id,type:"income"===e.type?"income":"transfer"===e.type?"transfer":"expense",title:e.title,amount:parseFloat(e.amount),due_day:e.due_day,category_id:e.category_id,category_name:e.category_name,wallet_id:e.wallet_id,wallet_name:e.wallet_name,to_wallet_id:e.to_wallet_id,to_wallet_name:e.to_wallet_name,auto_record:!!e.auto_record,is_active:e.is_active,is_paid:a,paid_date:e.paid_date,days_until_due:i,status:t,created_at:e.created_at}}),v=b.map(e=>({...e,monthly_limit:parseFloat(e.monthly_limit),spent:parseFloat(e.spent),remaining:parseFloat(e.remaining),percentage:parseFloat(String(e.percentage)),rollover_enabled:!!e.rollover_enabled,rollover_amount:parseFloat(String(e.rollover_amount??"0")),effective_limit:parseFloat(String(e.effective_limit??e.monthly_limit))})),I=c.map(e=>({...e,balance:parseFloat(e.balance)})),F=m.map(e=>({...e,amount:parseFloat(e.amount),admin_fee:parseFloat(e.admin_fee||"0")})),f=0,U=0,$=0,M=0;for(let e of C)if("paid"!==e.status){let t=!0===e.is_due_this_period,a=(e.active_bills_count?parseInt(String(e.active_bills_count),10):0)>0;if("payable"===e.type){if($++,t&&!a){let t=e.monthly_installment&&e.monthly_installment>0?Math.min(e.remaining_amount,e.monthly_installment):e.remaining_amount;f+=t}}else if(M++,t){let t=e.monthly_installment&&e.monthly_installment>0?Math.min(e.remaining_amount,e.monthly_installment):e.remaining_amount;U+=t}}let H=T-(D+f)+U;return t.NextResponse.json({success:!0,data:{wallets:I,categories:p,transactions:F,budgets:v,bills:w,debts:C,summary:{month:_,year:u,total_balance:T,total_income:g,total_expense:O,net_cash_flow:g-O,total_transfer:L,bill_pending_count:parseInt(S[0]?.count||"0",10),budget_over_count:parseInt(y[0]?.count||"0",10),total_bills_pending_amount:D,total_payable_due:f,total_receivable_due:U,safe_to_spend:H,payable_unpaid_count:$,receivable_unpaid_count:M},settings:A[0]||null}})}catch(e){return(0,n.handleRouteError)(e,"dashboard:bootstrap")}}e.s(["GET",0,s])},44386,e=>{"use strict";var t=e.i(47909),a=e.i(74017),i=e.i(96250),r=e.i(59756),n=e.i(61916),o=e.i(74677),s=e.i(69741),d=e.i(16795),l=e.i(87718),_=e.i(95169),u=e.i(47587),E=e.i(66012),c=e.i(70101),p=e.i(26937),m=e.i(10372),b=e.i(93695);e.i(52474);var h=e.i(220);let N=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/dashboard/bootstrap/route",pathname:"/api/dashboard/bootstrap",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/dashboard/bootstrap/route.ts",nextConfigOutput:"",userland:()=>e.r(32447),...{}}),{workAsyncStorage:R,workUnitAsyncStorage:S,serverHooks:y}=N;async function A(e,t,i){i.requestMeta&&(0,r.setRequestMeta)(e,i.requestMeta),N.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let R="/api/dashboard/bootstrap/route";R=R.replace(/\/index$/,"")||"/";let S=await N.prepare(e,t,{srcPage:R,multiZoneDraftMode:!1});if(!S)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:y,deploymentId:A,params:C,nextConfig:T,parsedUrl:g,isDraftMode:O,prerenderManifest:L,routerServerContext:D,isOnDemandRevalidate:w,revalidateOnlyGenerated:v,resolvedPathname:I,clientReferenceManifest:F,serverActionsManifest:f}=S,U=(0,s.normalizeAppPath)(R),$=!!(L.dynamicRoutes[U]||L.routes[I]),M=async()=>((null==D?void 0:D.render404)?await D.render404(e,t,g,!1):t.end("This page could not be found"),null);if($&&!O){let e=!!L.routes[I],t=L.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(T.adapterPath)return await M();throw new b.NoFallbackError}}let H=null;!$||N.isDev||O||(H="/index"===(H=I)?"/":H);let x=!0===N.isDev||!$,W=$&&!x;f&&F&&(0,o.setManifestsSingleton)({page:R,clientReferenceManifest:F,serverActionsManifest:f});let q=e.method||"GET",P=(0,n.getTracer)(),k=P.getActiveScopeSpan(),B=!!(null==D?void 0:D.isWrappedByNextServer),J=!!(0,r.getRequestMeta)(e,"minimalMode"),G=(0,r.getRequestMeta)(e,"incrementalCache")||await N.getIncrementalCache(e,T,L,J);null==G||G.resetRequestCache(),globalThis.__incrementalCache=G;let V={params:C,previewProps:L.preview,renderOpts:{experimental:{authInterrupts:!!T.experimental.authInterrupts,useCacheTimeout:T.experimental.useCacheTimeout},cacheComponents:!!T.cacheComponents,validationLevel:T.experimental.instantInsights.validationLevel,supportsDynamicResponse:x,incrementalCache:G,hmrRefreshHash:(0,r.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:T.cacheLife,staticPageGenerationTimeout:T.staticPageGenerationTimeout,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,i,r)=>N.onRequestError(e,t,i,r,D)},sharedContext:{buildId:y,deploymentId:A}},Y=new d.NodeNextRequest(e),j=new d.NodeNextResponse(t),K=l.NextRequestAdapter.fromNodeNextRequest(Y,(0,l.signalFromNodeResponse)(t)),Q=async({previousCacheEntry:a})=>{try{if(!J&&w&&v&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await N.handle(K,V);e.fetchMetrics=V.renderOpts.fetchMetrics;let n=V.renderOpts.pendingWaitUntil;n&&i.waitUntil&&(i.waitUntil(n),n=void 0);let o=V.renderOpts.collectedTags;if(!$)return await (0,E.sendResponse)(Y,j,r,n),null;{let e=await r.blob(),t=(0,c.toNodeOutgoingHttpHeaders)(r.headers);o&&(t[m.NEXT_CACHE_TAGS_HEADER]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==V.renderOpts.collectedRevalidate&&!(V.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&V.renderOpts.collectedRevalidate,i=void 0===V.renderOpts.collectedExpire||V.renderOpts.collectedExpire>=m.INFINITE_CACHE?!1!==a&&a>0?T.expireTime:void 0:V.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:i}}}}catch(t){throw(null==a?void 0:a.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:R,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:w})},!1,D),t}},X=async(r,o)=>{try{var s,d;let r=await N.handleResponse({req:e,nextConfig:T,cacheKey:H,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:L,isRoutePPREnabled:!1,isOnDemandRevalidate:w,revalidateOnlyGenerated:v,responseGenerator:Q,waitUntil:i.waitUntil,isMinimalMode:J});if(!$)return;if((null==r||null==(s=r.value)?void 0:s.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==r||null==(d=r.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});J||t.setHeader("x-nextjs-cache",w?"REVALIDATED":r.isMiss?"MISS":r.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let n=(0,c.fromNodeOutgoingHttpHeaders)(r.value.headers);J&&$||n.delete(m.NEXT_CACHE_TAGS_HEADER),!r.cacheControl||t.getHeader("Cache-Control")||n.get("Cache-Control")||n.set("Cache-Control",(0,p.getCacheControlHeader)(r.cacheControl)),await (0,E.sendResponse)(Y,j,new Response(r.value.body,{headers:n,status:r.value.status||200}));return}catch(t){if(t instanceof b.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:w})},!1,D),$)throw t;await (0,E.sendResponse)(Y,j,new Response(null,{status:500}));return}finally{(()=>{if(!r)return;let e=t.statusCode;r.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(r.setStatus({code:n.SpanStatusCode.ERROR}),r.setAttribute("error.type",e.toString()));let a=P.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==_.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=a.get("next.route")||U,s=`${q} ${i}`;r.setAttributes({"next.route":i,"http.route":i,"next.span_name":s}),r.updateName(s),o&&o!==r&&(o.setAttribute("http.route",i),o.updateName(s))})()}};if(B&&k)await X(k,void 0);else{let t=P.getActiveScopeSpan();await P.withPropagatedContext(e.headers,()=>P.trace(_.BaseServerSpan.handleRequest,{spanName:`${q} ${R}`,kind:n.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},e=>X(e,t)),void 0,!B)}}e.s(["handler",0,A,"patchFetch",0,function(){return(0,i.patchFetch)({workAsyncStorage:R,workUnitAsyncStorage:S})},"routeModule",0,N,"serverHooks",0,y,"workAsyncStorage",0,R,"workUnitAsyncStorage",0,S])}];

//# sourceMappingURL=_1nzpdix._.js.map