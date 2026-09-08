module.exports=[98094,e=>{"use strict";var t=e.i(89171),a=e.i(79832),n=e.i(43793),r=e.i(21475),i=e.i(44614);async function o(e,o){try{let s=await (0,a.requireAuth)(e),{id:l}=await o.params,d=r.uuidIdParam.parse(l),u=await (0,n.query)(`
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
      WHERE id = $1 AND user_id = $2
      `,[d,s.userId]);if(0===u.length)throw new i.BusinessError("Data hutang/piutang tidak ditemukan.",404);let p=await (0,n.query)(`
      SELECT 
        dp.id,
        dp.debt_id,
        dp.user_id,
        dp.wallet_id,
        w.name AS wallet_name,
        dp.amount::float AS amount,
        dp.payment_date,
        dp.notes,
        dp.created_at
      FROM debt_payments dp
      LEFT JOIN wallets w ON dp.wallet_id = w.id
      WHERE dp.debt_id = $1 AND dp.user_id = $2
      ORDER BY dp.payment_date DESC, dp.created_at DESC
      `,[d,s.userId]);return t.NextResponse.json({success:!0,data:{...u[0],payments:p}})}catch(e){return(0,i.handleRouteError)(e,"debts:get-one")}}async function s(e,o){try{let s=await (0,a.requireAuth)(e),{id:l}=await o.params,d=r.uuidIdParam.parse(l),u=await (0,i.readJsonBody)(e),p=r.debtSchema.parse(u),_=p.principal_amount??p.total_amount;if(_>p.total_amount)throw new i.BusinessError("Pokok hutang tidak boleh melebihi total nominal.");let c=Math.max(0,p.total_amount-_),m=await (0,n.query)("SELECT paid_amount::float AS paid_amount FROM debts WHERE id = $1 AND user_id = $2",[d,s.userId]);if(0===m.length)throw new i.BusinessError("Data hutang/piutang tidak ditemukan.",404);let E=Number(m[0]?.paid_amount)||0;if(p.total_amount<E)throw new i.BusinessError(`Total nominal tidak boleh lebih kecil dari yang sudah terbayar (${E.toLocaleString("id-ID")}).`,400);if(void 0!==p.initial_paid_amount&&null!==p.initial_paid_amount&&(p.initial_paid_amount<0||p.initial_paid_amount>p.total_amount))throw new i.BusinessError("Nominal terbayar awal harus di antara 0 dan total nominal.",400);let h=(await (0,n.query)(`
      UPDATE debts
      SET
        type = $1,
        category = $2,
        person_name = $3,
        total_amount = $4,
        principal_amount = $5,
        interest_rate = $6,
        interest_type = $7,
        tenor_months = $8,
        monthly_installment = $9,
        total_interest = $10,
        start_date = $11,
        due_date = $12,
        notes = $13,
        paid_amount = CASE 
          WHEN $14::numeric IS NOT NULL THEN $14::numeric 
          ELSE paid_amount 
        END,
        status = CASE
          WHEN (CASE WHEN $14::numeric IS NOT NULL THEN $14::numeric ELSE paid_amount END) >= $4 THEN 'paid'
          WHEN (CASE WHEN $14::numeric IS NOT NULL THEN $14::numeric ELSE paid_amount END) > 0 THEN 'partial'
          ELSE 'unpaid'
        END,
        updated_at = NOW()
      WHERE id = $15 AND user_id = $16
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
      `,[p.type,p.category??"hutang_pribadi",p.person_name,p.total_amount,_,p.interest_rate??null,p.interest_type??"flat",p.tenor_months??null,p.monthly_installment??null,c,p.start_date||null,p.due_date||null,p.notes||null,void 0!==p.initial_paid_amount?p.initial_paid_amount:null,d,s.userId]))[0];if("payable"===p.type&&p.monthly_installment&&p.monthly_installment>0)try{let e=await (0,n.query)("SELECT id FROM recurring_bills WHERE debt_id = $1 AND user_id = $2 LIMIT 1",[d,s.userId]),t=p.schedule_due_day||(p.start_date?new Date(p.start_date).getDate():10);e.length>0?await (0,n.query)(`UPDATE recurring_bills
             SET title = $1, amount = $2, due_day = $3, wallet_id = COALESCE($4, wallet_id),
                 category_id = COALESCE($7, category_id)
             WHERE debt_id = $5 AND user_id = $6`,[`Cicilan: ${p.person_name}`,p.monthly_installment,t,p.wallet_id||null,d,s.userId,p.budget_category_id||null]):await (0,n.query)(`INSERT INTO recurring_bills (user_id, type, title, amount, category_id, due_day, wallet_id, debt_id, auto_record, is_active)
             VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7, TRUE, TRUE)`,[s.userId,`Cicilan: ${p.person_name}`,p.monthly_installment,p.budget_category_id||null,t,p.wallet_id||null,d])}catch(e){}return t.NextResponse.json({success:!0,data:h})}catch(e){return(0,i.handleRouteError)(e,"debts:put")}}async function l(e,o){try{let s=await (0,a.requireAuth)(e),{id:l}=await o.params,d=r.uuidIdParam.parse(l);await (0,n.query)("DELETE FROM recurring_bills WHERE debt_id = $1 AND user_id = $2",[d,s.userId]);let u=await (0,n.query)("DELETE FROM debts WHERE id = $1 AND user_id = $2 RETURNING id",[d,s.userId]);if(0===u.length)throw new i.BusinessError("Data hutang/piutang tidak ditemukan.",404);return t.NextResponse.json({success:!0,message:"Hutang/piutang berhasil dihapus."})}catch(e){return(0,i.handleRouteError)(e,"debts:delete")}}e.s(["DELETE",0,l,"GET",0,o,"PUT",0,s])},90035,e=>{"use strict";var t=e.i(47909),a=e.i(74017),n=e.i(96250),r=e.i(59756),i=e.i(61916),o=e.i(74677),s=e.i(69741),l=e.i(16795),d=e.i(87718),u=e.i(95169),p=e.i(47587),_=e.i(66012),c=e.i(70101),m=e.i(26937),E=e.i(10372),h=e.i(93695);e.i(52474);var R=e.i(220);let y=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/debts/[id]/route",pathname:"/api/debts/[id]",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/debts/[id]/route.ts",nextConfigOutput:"",userland:()=>e.r(98094),...{}}),{workAsyncStorage:w,workUnitAsyncStorage:N,serverHooks:g}=y;async function A(e,t,n){n.requestMeta&&(0,r.setRequestMeta)(e,n.requestMeta),y.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let w="/api/debts/[id]/route";w=w.replace(/\/index$/,"")||"/";let N=await y.prepare(e,t,{srcPage:w,multiZoneDraftMode:!1});if(!N)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:g,deploymentId:A,params:S,nextConfig:f,parsedUrl:T,isDraftMode:C,prerenderManifest:b,routerServerContext:v,isOnDemandRevalidate:$,revalidateOnlyGenerated:D,resolvedPathname:H,clientReferenceManifest:I,serverActionsManifest:x}=N,L=(0,s.normalizeAppPath)(w),O=!!(b.dynamicRoutes[L]||b.routes[H]),P=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,T,!1):t.end("This page could not be found"),null);if(O&&!C){let e=!!b.routes[H],t=b.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(f.adapterPath)return await P();throw new h.NoFallbackError}}let U=null;!O||y.isDev||C||(U="/index"===(U=H)?"/":U);let q=!0===y.isDev||!O,k=O&&!q;x&&I&&(0,o.setManifestsSingleton)({page:w,clientReferenceManifest:I,serverActionsManifest:x});let M=e.method||"GET",W=(0,i.getTracer)(),F=W.getActiveScopeSpan(),B=!!(null==v?void 0:v.isWrappedByNextServer),j=!!(0,r.getRequestMeta)(e,"minimalMode"),G=(0,r.getRequestMeta)(e,"incrementalCache")||await y.getIncrementalCache(e,f,b,j);null==G||G.resetRequestCache(),globalThis.__incrementalCache=G;let K={params:S,previewProps:b.preview,renderOpts:{experimental:{authInterrupts:!!f.experimental.authInterrupts,useCacheTimeout:f.experimental.useCacheTimeout},cacheComponents:!!f.cacheComponents,validationLevel:f.experimental.instantInsights.validationLevel,supportsDynamicResponse:q,incrementalCache:G,hmrRefreshHash:(0,r.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:f.cacheLife,staticPageGenerationTimeout:f.staticPageGenerationTimeout,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,r)=>y.onRequestError(e,t,n,r,v)},sharedContext:{buildId:g,deploymentId:A}},V=new l.NodeNextRequest(e),X=new l.NodeNextResponse(t),J=d.NextRequestAdapter.fromNodeNextRequest(V,(0,d.signalFromNodeResponse)(t)),z=async({previousCacheEntry:a})=>{try{if(!j&&$&&D&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await y.handle(J,K);e.fetchMetrics=K.renderOpts.fetchMetrics;let i=K.renderOpts.pendingWaitUntil;i&&n.waitUntil&&(n.waitUntil(i),i=void 0);let o=K.renderOpts.collectedTags;if(!O)return await (0,_.sendResponse)(V,X,r,i),null;{let e=await r.blob(),t=(0,c.toNodeOutgoingHttpHeaders)(r.headers);o&&(t[E.NEXT_CACHE_TAGS_HEADER]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==K.renderOpts.collectedRevalidate&&!(K.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&K.renderOpts.collectedRevalidate,n=void 0===K.renderOpts.collectedExpire||K.renderOpts.collectedExpire>=E.INFINITE_CACHE?!1!==a&&a>0?f.expireTime:void 0:K.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==a?void 0:a.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:w,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:$})},!1,v),t}},Y=async(r,o)=>{try{var s,l;let r=await y.handleResponse({req:e,nextConfig:f,cacheKey:U,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:b,isRoutePPREnabled:!1,isOnDemandRevalidate:$,revalidateOnlyGenerated:D,responseGenerator:z,waitUntil:n.waitUntil,isMinimalMode:j});if(!O)return;if((null==r||null==(s=r.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==r||null==(l=r.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});j||t.setHeader("x-nextjs-cache",$?"REVALIDATED":r.isMiss?"MISS":r.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,c.fromNodeOutgoingHttpHeaders)(r.value.headers);j&&O||i.delete(E.NEXT_CACHE_TAGS_HEADER),!r.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,m.getCacheControlHeader)(r.cacheControl)),await (0,_.sendResponse)(V,X,new Response(r.value.body,{headers:i,status:r.value.status||200}));return}catch(t){if(t instanceof h.NoFallbackError||await y.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:$})},!1,v),O)throw t;await (0,_.sendResponse)(V,X,new Response(null,{status:500}));return}finally{(()=>{if(!r)return;let e=t.statusCode;r.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(r.setStatus({code:i.SpanStatusCode.ERROR}),r.setAttribute("error.type",e.toString()));let a=W.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route")||L,s=`${M} ${n}`;r.setAttributes({"next.route":n,"http.route":n,"next.span_name":s}),r.updateName(s),o&&o!==r&&(o.setAttribute("http.route",n),o.updateName(s))})()}};if(B&&F)await Y(F,void 0);else{let t=W.getActiveScopeSpan();await W.withPropagatedContext(e.headers,()=>W.trace(u.BaseServerSpan.handleRequest,{spanName:`${M} ${w}`,kind:i.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},e=>Y(e,t)),void 0,!B)}}e.s(["handler",0,A,"patchFetch",0,function(){return(0,n.patchFetch)({workAsyncStorage:w,workUnitAsyncStorage:N})},"routeModule",0,y,"serverHooks",0,g,"workAsyncStorage",0,w,"workUnitAsyncStorage",0,N])}];

//# sourceMappingURL=_0is9-6w._.js.map