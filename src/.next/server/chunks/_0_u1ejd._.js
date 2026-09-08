module.exports=[55179,e=>{"use strict";var t=e.i(89171),a=e.i(79832),n=e.i(43793),r=e.i(21475),i=e.i(44614);async function o(e){try{let i=await (0,a.requireAuth)(e),o=e.nextUrl.searchParams,s=o.get("type")||void 0,l=o.get("status")||void 0,u=r.debtQuerySchema.safeParse({type:s,status:l}),{type:d,status:p}=u.success?u.data:{},c=`
      SELECT 
        id,
        user_id,
        type,
        category,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        (total_amount - paid_amount)::float AS remaining_amount,
        principal_amount::float AS principal_amount,
        interest_rate::float AS interest_rate,
        interest_type,
        tenor_months,
        monthly_installment::float AS monthly_installment,
        total_interest::float AS total_interest,
        start_date,
        due_date,
        notes,
        status,
        CASE 
          WHEN due_date IS NOT NULL THEN (due_date - CURRENT_DATE)
          ELSE NULL 
        END AS days_until_due,
        CASE 
          WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE AND status != 'paid' THEN TRUE
          ELSE FALSE 
        END AS is_overdue,
        created_at,
        updated_at
      FROM debts
      WHERE user_id = $1
    `,_=[i.userId],m=2;d&&(c+=` AND type = $${m}`,_.push(d),m++),p&&(c+=` AND status = $${m}`,_.push(p),m++),c+=" ORDER BY status ASC, due_date ASC NULLS LAST, created_at DESC";let h=await (0,n.query)(c,_);return t.NextResponse.json({success:!0,data:h})}catch(e){return(0,i.handleRouteError)(e,"debts:get")}}async function s(e){try{let o=await (0,a.requireAuth)(e),s=await (0,i.readJsonBody)(e),l=r.debtSchema.parse(s),u=l.principal_amount||l.total_amount,d=l.total_amount;if(u>d)throw new i.BusinessError("Pokok hutang tidak boleh melebihi total nominal.");let p=Math.max(0,d-u),c=l.start_date||null,_=l.due_date||null,m=void 0!==l.initial_paid_amount&&null!==l.initial_paid_amount?l.initial_paid_amount:0;if(c&&l.monthly_installment&&l.monthly_installment>0){let e=new Date(c),t=new Date;if(!isNaN(e.getTime())){let a=(t.getFullYear()-e.getFullYear())*12+(t.getMonth()-e.getMonth());if(a>0&&(!l.initial_paid_amount||0===l.initial_paid_amount)){let e=a*l.monthly_installment;m=Math.min(d,e)}let n=e.getDate(),r=t.getFullYear(),i=t.getMonth();t.getDate()>n&&(i+=1)>11&&(i=0,r+=1);let o=Math.min(n,new Date(r,i+1,0).getDate());_=`${r}-${String(i+1).padStart(2,"0")}-${String(o).padStart(2,"0")}`}}let h=m>=d?"paid":m>0?"partial":"unpaid",{createdDebt:R,billScheduled:E,createdAsset:y}=await (0,n.withTransaction)(async e=>{let t=(await e.query(`
      INSERT INTO debts (
        user_id,
        type,
        category,
        person_name,
        total_amount,
        paid_amount,
        principal_amount,
        interest_rate,
        interest_type,
        tenor_months,
        monthly_installment,
        total_interest,
        start_date,
        due_date,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING
        id,
        user_id,
        type,
        category,
        person_name,
        total_amount::float AS total_amount,
        paid_amount::float AS paid_amount,
        (total_amount - paid_amount)::float AS remaining_amount,
        principal_amount::float AS principal_amount,
        interest_rate::float AS interest_rate,
        interest_type,
        tenor_months,
        monthly_installment::float AS monthly_installment,
        total_interest::float AS total_interest,
        start_date,
        due_date,
        notes,
        status,
        created_at,
        updated_at
      `,[o.userId,l.type,l.category||"hutang_pribadi",l.person_name,d,m,u,l.interest_rate||0,l.interest_type||"flat",l.tenor_months||null,l.monthly_installment||null,p,c,_,l.notes||null,h])).rows[0],a=null;if(l.create_asset){let t="kpr_rumah"===l.category?"properti":"kredit_kendaraan"===l.category?"kendaraan":"properti",n=l.asset_price||u||d,r=l.asset_name||l.person_name,i=c||_||new Date().toISOString().split("T")[0];a=(await e.query(`INSERT INTO assets (
            user_id, name, category, purchase_date, purchase_price, current_value, depreciation_method, useful_life_years, salvage_value, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9) RETURNING id, name, category, purchase_price::float AS purchase_price`,[o.userId,r,t,i,n,n,"properti"===t?"none":"straight_line","properti"===t?1:5,`Aset terhubung dengan pinjaman: ${l.person_name}`])).rows[0]}let n=!1,r=null;if("payable"===l.type&&l.monthly_installment&&l.monthly_installment>0)try{let a=l.wallet_id||null;if(a){let t=await e.query("SELECT 1 FROM wallets WHERE id = $1 AND user_id = $2",[a,o.userId]);0===t.rows.length&&(a=null)}let i=l.budget_category_id||null;if(i){let t=await e.query("SELECT 1 FROM categories WHERE id = $1 AND user_id = $2 AND type = 'expense'",[i,o.userId]);0===t.rows.length&&(i=null)}let s=await e.query(`INSERT INTO recurring_bills (
            user_id, type, title, amount, due_day, category_id, wallet_id, debt_id, auto_record, is_active
          ) VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7, TRUE, TRUE)
          RETURNING id`,[o.userId,`Cicilan: ${l.person_name}`,l.monthly_installment,l.schedule_due_day||(c?new Date(c).getDate():10),i,a,t.id]);n=!0,r=s.rows[0]?.id||null}catch(e){n=!1}if(c&&l.monthly_installment&&l.monthly_installment>0&&m>0){let a=new Date(c),n=new Date,i=Math.min(28,a.getDate()),s=a.getFullYear(),u=a.getMonth()+1,d=n.getFullYear(),p=n.getMonth()+1,_=0;for(;(s<d||s===d&&u<p)&&_<m;){let a=Math.min(l.monthly_installment,m-_);if(a<=0)break;let n=`${s}-${String(u).padStart(2,"0")}-${String(i).padStart(2,"0")}`;await e.query(`INSERT INTO debt_payments (debt_id, user_id, wallet_id, amount, payment_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,[t.id,o.userId,l.wallet_id||null,a,n,`Cicilan berjalan (${u}/${s})`]),r&&await e.query(`INSERT INTO bill_payments (user_id, bill_id, paid_date, amount, month, year)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (user_id, bill_id, month, year) DO NOTHING`,[o.userId,r,n,a,u,s]),_+=a,++u>12&&(u=1,s++)}}return{createdDebt:t,billScheduled:n,createdAsset:a}});return t.NextResponse.json({success:!0,data:{...R,bill_scheduled:E,created_asset:y}},{status:201})}catch(e){return(0,i.handleRouteError)(e,"debts:post")}}e.s(["GET",0,o,"POST",0,s])},21161,e=>{"use strict";var t=e.i(47909),a=e.i(74017),n=e.i(96250),r=e.i(59756),i=e.i(61916),o=e.i(74677),s=e.i(69741),l=e.i(16795),u=e.i(87718),d=e.i(95169),p=e.i(47587),c=e.i(66012),_=e.i(70101),m=e.i(26937),h=e.i(10372),R=e.i(93695);e.i(52474);var E=e.i(220);let y=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/debts/route",pathname:"/api/debts",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/debts/route.ts",nextConfigOutput:"",userland:()=>e.r(55179),...{}}),{workAsyncStorage:g,workUnitAsyncStorage:S,serverHooks:f}=y;async function A(e,t,n){n.requestMeta&&(0,r.setRequestMeta)(e,n.requestMeta),y.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/debts/route";g=g.replace(/\/index$/,"")||"/";let S=await y.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!S)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:f,deploymentId:A,params:w,nextConfig:$,parsedUrl:N,isDraftMode:T,prerenderManifest:v,routerServerContext:C,isOnDemandRevalidate:b,revalidateOnlyGenerated:I,resolvedPathname:x,clientReferenceManifest:D,serverActionsManifest:O}=S,U=(0,s.normalizeAppPath)(g),P=!!(v.dynamicRoutes[U]||v.routes[x]),q=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,N,!1):t.end("This page could not be found"),null);if(P&&!T){let e=!!v.routes[x],t=v.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if($.adapterPath)return await q();throw new R.NoFallbackError}}let M=null;!P||y.isDev||T||(M="/index"===(M=x)?"/":M);let L=!0===y.isDev||!P,H=P&&!L;O&&D&&(0,o.setManifestsSingleton)({page:g,clientReferenceManifest:D,serverActionsManifest:O});let k=e.method||"GET",F=(0,i.getTracer)(),j=F.getActiveScopeSpan(),G=!!(null==C?void 0:C.isWrappedByNextServer),B=!!(0,r.getRequestMeta)(e,"minimalMode"),K=(0,r.getRequestMeta)(e,"incrementalCache")||await y.getIncrementalCache(e,$,v,B);null==K||K.resetRequestCache(),globalThis.__incrementalCache=K;let V={params:w,previewProps:v.preview,renderOpts:{experimental:{authInterrupts:!!$.experimental.authInterrupts,useCacheTimeout:$.experimental.useCacheTimeout},cacheComponents:!!$.cacheComponents,validationLevel:$.experimental.instantInsights.validationLevel,supportsDynamicResponse:L,incrementalCache:K,hmrRefreshHash:(0,r.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:$.cacheLife,staticPageGenerationTimeout:$.staticPageGenerationTimeout,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,r)=>y.onRequestError(e,t,n,r,C)},sharedContext:{buildId:f,deploymentId:A}},W=new l.NodeNextRequest(e),Y=new l.NodeNextResponse(t),X=u.NextRequestAdapter.fromNodeNextRequest(W,(0,u.signalFromNodeResponse)(t)),z=async({previousCacheEntry:a})=>{try{if(!B&&b&&I&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await y.handle(X,V);e.fetchMetrics=V.renderOpts.fetchMetrics;let i=V.renderOpts.pendingWaitUntil;i&&n.waitUntil&&(n.waitUntil(i),i=void 0);let o=V.renderOpts.collectedTags;if(!P)return await (0,c.sendResponse)(W,Y,r,i),null;{let e=await r.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(r.headers);o&&(t[h.NEXT_CACHE_TAGS_HEADER]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==V.renderOpts.collectedRevalidate&&!(V.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&V.renderOpts.collectedRevalidate,n=void 0===V.renderOpts.collectedExpire||V.renderOpts.collectedExpire>=h.INFINITE_CACHE?!1!==a&&a>0?$.expireTime:void 0:V.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==a?void 0:a.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:b})},!1,C),t}},J=async(r,o)=>{try{var s,l;let r=await y.handleResponse({req:e,nextConfig:$,cacheKey:M,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:I,responseGenerator:z,waitUntil:n.waitUntil,isMinimalMode:B});if(!P)return;if((null==r||null==(s=r.value)?void 0:s.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==r||null==(l=r.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",b?"REVALIDATED":r.isMiss?"MISS":r.isStale?"STALE":"HIT"),T&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,_.fromNodeOutgoingHttpHeaders)(r.value.headers);B&&P||i.delete(h.NEXT_CACHE_TAGS_HEADER),!r.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,m.getCacheControlHeader)(r.cacheControl)),await (0,c.sendResponse)(W,Y,new Response(r.value.body,{headers:i,status:r.value.status||200}));return}catch(t){if(t instanceof R.NoFallbackError||await y.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:b})},!1,C),P)throw t;await (0,c.sendResponse)(W,Y,new Response(null,{status:500}));return}finally{(()=>{if(!r)return;let e=t.statusCode;r.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(r.setStatus({code:i.SpanStatusCode.ERROR}),r.setAttribute("error.type",e.toString()));let a=F.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route")||U,s=`${k} ${n}`;r.setAttributes({"next.route":n,"http.route":n,"next.span_name":s}),r.updateName(s),o&&o!==r&&(o.setAttribute("http.route",n),o.updateName(s))})()}};if(G&&j)await J(j,void 0);else{let t=F.getActiveScopeSpan();await F.withPropagatedContext(e.headers,()=>F.trace(d.BaseServerSpan.handleRequest,{spanName:`${k} ${g}`,kind:i.SpanKind.SERVER,attributes:{"http.method":k,"http.target":e.url}},e=>J(e,t)),void 0,!G)}}e.s(["handler",0,A,"patchFetch",0,function(){return(0,n.patchFetch)({workAsyncStorage:g,workUnitAsyncStorage:S})},"routeModule",0,y,"serverHooks",0,f,"workAsyncStorage",0,g,"workUnitAsyncStorage",0,S])}];

//# sourceMappingURL=_0_u1ejd._.js.map