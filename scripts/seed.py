"""Curated research snapshot. No market prices or ratings are synthesized."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATE='2026-09-27'
sources={}; beers=[]
def src(i,url,title,kind='review',evidence='page',published=None,note=''):
 sources[i]={'id':i,'url':url,'title':title,'kind':kind,'evidence':evidence,'publishedAt':published,'checkedAt':DATE,'note':note}; return i
def ba(id,path,title):
 return src('ba-'+id,'https://www.beeradvocate.com/beer/profile/'+path+'/',title+' · BeerAdvocate')
def price(id,total,qty,ml,url,title,historical=False,date=None,caution='',ambiguous=False):
 sid=src('price-'+id,url,title,'price','search-index',date,'第三方价格记录；部分正文打开失败，依据搜索索引。不是商家实时成交报价。')
 return {'total':total,'quantity':qty,'volumeMl':ml,'currency':'CNY','sourceId':sid,'historical':historical,'ambiguous':ambiguous,'note':caution or '页面报价样本；活动有效期、运费、税费、库存与账号条件均未现场结算核验。','checkedAt':DATE}
def add(id,name,en,family,style,country,abv,ml,avg,n,path,tags,good,caution,fit,quote=None,original=False,alias='',extra=''):
 s=ba(id,path,name) if path else None
 beers.append({'id':id,'name':name,'english':en,'family':family,'style':style,'country':country,'abv':abv,'volumeMl':ml,'rating':({'platform':'BeerAdvocate','scale':5,'value':avg,'count':n,'sourceId':s,'checkedAt':DATE} if avg is not None else None),'tags':tags.split('、') if tags else [],'review':{'positive':good,'caution':caution,'fit':fit,'sourceIds':[s] if s else [],'type':'公开品饮评价的归纳；适合人群为编辑判断，不代表亲自试饮'},'quote':quote,'originalList':original,'aliases':[alias] if alias else [],'identityNote':extra,'identityPending':False})
P={}
P['paulaner']=price('paulaner',195,24,500,'https://m.smzdm.com/p/180562773/','保拉纳小麦白啤 500ml×24听，195元')
P['weihen']=price('weihen',71.3,6,500,'https://pinpai.smzdm.com/51019/wiki/','维森小麦白啤 500ml×6瓶，71.3元起',ambiguous=True,caution='这是“起价”聚合记录；部分关联描述混用水晶白。必须确认买到 Hefeweissbier 原味浑浊小麦，而非 Kristall。未核对前不参与默认前沿。')
P['chimay']=price('chimay',96.5,6,330,'https://www.smzdm.com/p/180903930/','智美蓝帽 330ml×6瓶，96.5元')
P['rochefort10']=price('rochefort10',102.9,5,330,'https://www.smzdm.com/p/182750989/','罗斯福10号 330ml×5瓶，页面价102.9元',caution='取页面价102.90元，不采用97.90元的条件优惠；页面月日显示09-21但年份未完整核实。运费与库存未核验。')
category='https://www.smzdm.com/ju/s256vjm/'
P['rochefort8']=price('rochefort8',79.9,5,330,category,'分类聚合页：罗斯福8号 330ml×5瓶，79.9元')
P['benediktiner']=price('benediktiner',158,24,500,category,'分类聚合页：百帝王白啤 500ml×24，158元')
P['orval']=price('orval',36,1,330,category,'分类聚合页：奥威 330ml单瓶，36元')
P['franziskaner']=price('franziskaner',159.9,20,500,'https://www.smzdm.com/p/74766759/','教士德国进口白啤 500ml×20，159.9元',True,'2023-03-11','2023年券后历史促销，默认排除。不能套用国产范佳乐450ml的价格。')
P['kingsue']=price('kingsue',27.2,1,473,'https://www.smzdm.com/p/113214192/','暴龙王 King Sue 473ml，27.2元',True,'2024-05-20','2024年促销历史记录，不能当作今天可买到的价格；默认排除。核对具体批次和规格。')
P['guinness']=price('guinness',44.9,4,440,'https://www.smzdm.com/p/180710938/','健力士 Draught 440ml×4，活动标价44.9元',caution='保留活动标价44.9元；没有采用88VIP等优惠后的36.2元。不是Foreign Extra。活动是否仍可用未核验。')
P['snow']=price('snow',56.5,12,640,'https://m.smzdm.com/p/181560653/','沈阳老雪花 640ml×12，56.5元')
P['pilsner']=price('pilsner',356,24,500,'https://m.9998.tv/baike/64657.html','博世纳 500ml×24，参考356元',True,'2023-02-16','2023年资讯站参考价，不是实际成交或实时商家报价；默认排除。')
add('weihen','维森原味小麦','Weihenstephaner Hefeweissbier','wheat','德式小麦 Hefeweizen','德国',5.4,500,4.41,9420,'252/731','香蕉、丁香、面包','评价集中在香蕉与丁香香、细腻麦香和顺滑平衡，社区样本量较大。','清爽拉格爱好者可能觉得酒体偏厚；现有价格页有版本歧义，必须核对原味浑浊款。','希望从普通白啤升级、看重平衡而非极端浓烈的人。',P['weihen'],True,'维森 水晶白','此条仅 Hefeweissbier；Kristall 水晶白是不同酒款。')
add('paulaner','保拉纳小麦白啤','Paulaner Hefe-Weissbier Naturtrüb','wheat','德式小麦 Hefeweizen','德国',5.5,500,4.06,4099,'124/1256','香蕉、丁香、麦香','麦香、香蕉与轻香料是典型反馈，泡沫和气泡感明显。','风味不是越浓越好；只喜欢干爽口感的人可能不偏爱麦芽甜感。','想用较低成本尝试德式小麦。',P['paulaner'],True,'柏龙 保拉纳')
add('ayinger','艾英格小麦白啤','Ayinger Bräuweisse','wheat','德式小麦 Hefeweizen','德国',5.1,500,4.17,2602,'39/132','香蕉、麦香、柔和香料','口碑重点是柔和麦香、香蕉香与顺滑平衡，不以极端香气取胜。','国内同规格价格未核实；仅凭品牌溢价不能判断性价比。','偏好细腻传统小麦，愿意与维森对照的人。',None,True,'Ayinger','不要与艾丁格 Erdinger 混淆。')
add('benediktiner','百帝王小麦白啤','Benediktiner Weissbier','wheat','德式小麦 Hefeweizen','德国',5.4,500,3.83,471,'2432/55287','香蕉、丁香、麦甜','典型香蕉与丁香风味，入口有麦甜，属于传统小麦路线。','有评价认为风味表达较收敛、酒体偏轻；样本量比维森小。','预算较紧，又想尝试进口小麦的人。',P['benediktiner'],False,'百帝王 本笃')
add('franziskaner','教士进口小麦白啤','Franziskaner Premium Weissbier','wheat','德式小麦 Hefeweizen','德国',5,500,4.07,5078,'142/1946','小麦、香蕉、泡沫','以传统小麦风味、浑浊外观与绵密泡沫受到认可。','保留的是2023年旧促销；国产范佳乐与德国进口版应分开比较。','传统白啤备选；有实际到手价再与保拉纳比较。',P['franziskaner'],False,'教士 范佳乐','本条为德国进口500ml；不把评分直接移植到国产450ml。')
add('erdinger','艾丁格小麦白啤','Erdinger Weissbier','wheat','德式小麦 Hefeweizen','德国',5.3,500,3.56,2302,'703/2434','轻麦香、轻香蕉、气泡','评价常见较轻的香蕉、丁香与活跃气泡，表达相对温和。','部分评价觉得薄、香气不够突出；不等于喜欢清淡的人会不喜欢。','偏温和口感，且到手价有优势的人。',None,False,'Erdinger','艾丁格与艾英格不是同一品牌。')
add('vitus','维森维图斯','Weihenstephaner Vitus','wheat','小麦博克 Weizenbock','德国',7.7,500,4.28,4078,'252/35625','杏果、香蕉、丁香','杏果、柑橘和丁香香气，酒体较饱满，气泡与顺滑感并存。','7.7%酒精度，不应按普通清淡白啤理解。','喜欢小麦、想尝试更浓郁版本。',None,False,'维图斯 维森Vitus')
add('tap6','施纳德6号','Schneider Weisse Aventinus','wheat','小麦博克 Weizenbock','德国',8.2,500,4.33,4916,'72/224','丁香、焦糖、深色水果','焦糖、丁香和深色果香叠在小麦底味上，浓郁而有层次。','现有118.68元记录的包装数量没核实，故没有除成“单瓶价”；酒精感偏强。','想体验深色浓郁小麦的人。',None,False,'施耐德6号 Aventinus')
add('rochefort10','罗斯福10号','Trappistes Rochefort 10','belgian','四料 Quadrupel','比利时',11.3,330,4.50,10109,'207/645','深色水果、焦糖、烘烤','深色果干、糖蜜与烘烤麦芽构成厚实风味，社区口碑稳定。','11.3%酒精度且偏浓厚；“10号”不是10%酒精度。适合人群不如淡啤广。','喜欢果干、焦糖和浓郁麦芽，能接受高酒精度。',P['rochefort10'])
add('rochefort8','罗斯福8号','Trappistes Rochefort 8','belgian','比利时深色烈性艾尔','比利时',9.2,330,4.33,5776,'207/1696','果干、深色麦芽、香料','以果干、深色麦芽和较有力气泡表现复杂度。','高酒精度与浓郁感未必适合清爽需求；聚合报价日期不完整。','想探索比利时深色艾尔，同时比较8号与10号差价。',P['rochefort8'])
add('chimay','智美蓝帽','Chimay Bleue / Grande Réserve','belgian','比利时深色烈性艾尔','比利时',9,330,4.30,8489,'215/2512','深色果香、麦芽、香料','深色麦芽、果香与香料感是主要风味方向，口碑样本较大。','蓝、红、白帽不是同一酒；750ml与330ml也不能直接按瓶价比较。','喜欢浓郁果干麦芽型风味。',P['chimay'],False,'智美 蓝帽')
add('abt12','圣伯纳12号','St. Bernardus Abt 12','belgian','四料 Quadrupel','比利时',10,330,4.47,10464,'259/1708','葡萄干、李子、焦糖','评价以葡萄干、李子、糖蜜和香料的浓厚层次见长。','10%且偏甜浓；不要拿圣伯纳白啤或圣诞款的价格代入。','喜欢深色烈性艾尔，想与罗斯福10对比。',None,False,'圣伯纳 Abt12 圣伯纳杜斯')
add('duvel','督威经典款','Duvel Original','belgian','比利时淡色烈性艾尔','比利时',8.5,330,4.25,8646,'222/695','柑橘、酵母香料、干爽','柑橘与酵母香料，气泡充足，收口较干。','酒精度不低，也不是甜果汁型；6.66和三花是不同款。','喜欢香料、干爽和较明显苦味。',None,False,'Duvel','只对应经典8.5%；不套用6.66或三花Citra报价。')
add('karmeliet','卡美里特三料','Tripel Karmeliet','belgian','三料 Tripel','比利时',8.4,330,4.29,4651,'202/656','橙香、花香、香料','大麦、小麦、燕麦基底，评价提到橙香、香蕉和花香，柔和但有气泡支撑。','8.4%酒精度；“三料”不是简单的原料数量或品质等级。','想尝试比深色四料更明亮的比利时风味。',None,False,'卡麦利特 卡美里特')
add('westmalle','西麦尔三料','Westmalle Tripel','belgian','三料 Tripel','比利时',9.5,330,4.30,5079,'208/646','酵母香料、香蕉、酒花','香蕉、酵母香料与酒花结合，果香之外有干爽苦味。','酒精暖感与苦味更有存在感，不适合只追求甜柔。','喜欢比利时香料香，也接受干苦收口。',None,False,'西麦尔 Westmalle')
add('orval','奥威','Orval','belgian','比利时淡色艾尔','比利时',6.2,330,4.20,5988,'37/129','干爽、酵母、酒花','果香、酒花和特别的酵母气息，风格干爽而有复杂感。','不同日期或市场标签酒精度可能不同；本页6.2%为BA记录，实物优先。','对干爽发酵风味好奇，而非只想喝甜麦香。',P['orval'],False,'奥瓦 奥威')
add('hoegaarden','福佳白比利时原版','Hoegaarden Original White Ale','wheat','比利时白啤 Witbier','比利时',4.9,330,3.79,5853,'83/248','橙皮、芫荽、轻麦香','橙皮、芫荽与柔和麦香，风格轻盈、柑橘感明显。','部分评价觉得甜或薄；没有把进口原版评分直接套给国产包装。','喜欢轻香料、柑橘调而不追求强苦味。',None,False,'福佳白','只记录比利时原版；国产版、玫瑰款需独立核验。')
add('sierra','内华达山脉淡色艾尔','Sierra Nevada Pale Ale','hoppy','美式淡色艾尔 APA','美国',5.6,355,4.04,12392,'140/276','柑橘、松香、麦芽','柑橘与香料类酒花叠在麦芽底味上，属于经典美式淡艾尔。','不是浑浊果汁型；苦味与麦芽同时存在。国内报价待补。','想尝试清晰酒花与麦芽平衡。',None,False,'内华达山脉 Sierra Nevada')
add('torpedo','内华达山脉鱼雷','Sierra Nevada Torpedo Extra IPA','hoppy','美式 IPA','美国',7.2,355,4.15,11779,'140/30420','柑橘、松针、草本','柑橘、松针与草本酒花，麦芽仍有存在感。','苦味比较明确，7.2%；不适合把IPA理解成纯果汁。','更喜欢干净苦味与松香的酒花爱好者。',None,False,'鱼雷 Torpedo')
add('pseudosue','伪暴龙','Toppling Goliath Pseudo Sue','hoppy','浑浊淡色艾尔','美国',5.8,473,4.49,5893,'23222/72170','葡萄柚、芒果、柑橘','以Citra带来的葡萄柚、芒果与柑橘香获得好评，酒体相对轻。','5.8%为BA记录，实际批次可能不同；国内可核实价格缺失。','想探索美式浑浊香气，但不直接选择双倍IPA。',None,False,'伪暴龙 Pseudo Sue')
add('kingsue','暴龙王','Toppling Goliath King Sue','hoppy','浑浊双倍 IPA','美国',8.2,473,4.57,3627,'23222/113674','热带水果、柑橘、浓酒花','Citra热带水果与柑橘香非常集中，社区评价突出。','也有酒花辛辣感反馈；8.2%为页面当前值，批次可变。旧促销价不代表现价。','专门探索浓郁浑浊双倍IPA，而非低预算日常选项。',P['kingsue'],True,'暴龙之王 King Sue')
add('rasputin','北岸老拉斯普京','North Coast Old Rasputin','dark','俄式帝国世涛','美国',9,355,4.30,13215,'112/412','烘烤、深色麦芽、苦巧克力','浓郁烘烤麦芽、饱满口感和明显暖感是常见评价。','“俄式”指风格，酒厂在美国；不要和氮气或桶陈变体混价。','喜欢烘烤与强烈深色麦芽。',None,False,'老拉斯普京 拉斯普京')
add('breakfast','创始者早餐世涛','Founders Breakfast Stout','dark','燕麦世涛','美国',8.3,355,4.51,18032,'1199/11757','咖啡、巧克力、燕麦','咖啡、巧克力和燕麦的烘烤层次，社区评分与样本量都较突出。','个别评价认为酒体偏薄或有酸涩；不能据此断言配方改变。国内报价待补。','喜欢咖啡可可风味，愿意核对价格后再做进阶选择。',None,False,'创始人 早餐世涛','“早餐”为酒名，不是早晨饮酒建议；KBS是另一款。')
add('guinness','健力士氮气世涛','Guinness Draught','dark','爱尔兰干世涛','爱尔兰',4.2,440,3.61,8989,'209/754','轻烘烤、细泡、干爽','口感顺滑、烘烤气息轻，身体感并非浓厚帝国世涛。','不喜欢的人会觉得偏薄；Draught不等于Foreign Extra。地区标签可略有变化。','想试轻巧干爽的黑啤，而不是甜品型世涛。',P['guinness'],False,'健力士 氮气 Guinness')
add('beaver','海狸万岁','Belching Beaver ¡Viva La Beaver!','dark','甜世涛 / 牛奶世涛','美国',7.5,473,4.09,185,'30923/235819','花生酱、巧克力、肉桂','花生酱、巧克力、肉桂与咖啡感突出，是鲜明的甜品路线。','甜腻或花生酱存在感太强是争议点；评分样本较少。关注实物配料及过敏原。','喜欢甜点、咖啡与巧克力风味。',None,True,'海狸万岁')
add('pilsner','博世纳乌奎尔','Pilsner Urquell','lager','捷克皮尔森','捷克',4.4,500,3.65,4639,'1/429','麦芽、萨兹酒花、清苦','麦芽底味和萨兹酒花苦味的平衡，风格清晰而不过度浓厚。','社区分数不及烈性精酿，不代表清爽场景差；国内仅找到较旧参考报价。','希望拉格有麦香与苦味，而不是追求浓烈果香。',P['pilsner'],True,'博士纳 博世纳 皮尔森乌奎尔')
add('heineken','喜力经典款 · 进口原版','Heineken Lager Beer','lager','欧洲淡色拉格','荷兰',5,500,2.75,5870,'81/246','淡麦芽、草本、干爽','轻麦芽与草本苦味，熟悉度高；评价分歧明显。','BA是国际经典款样本，不是国产绿瓶、绿罐的独立盲测；不按包装制造酒质高低。','已经喜欢经典喜力口味的人；先按自己的偏好，而不是只看社区低分。',None,False,'喜力 Heineken','此条只用于国际经典款口碑；你的国产绿瓶/绿罐在候选区单列，不自动移植评分。')
# These rows intentionally do not borrow ratings from another beer or an earlier, unverified answer.
def pending(id,name,en,family,style,country,ml,tags,good,caution,fit,sourceid=None,quote=None,abv=None,alias='',identity=False):
 add(id,name,en,family,style,country,abv,ml,None,None,None,tags,good,caution,fit,quote,True,alias)
 beers[-1]['review']['sourceIds']=[sourceid] if sourceid else []
 beers[-1]['identityPending']=identity
 if sourceid is None: beers[-1]['review']['type']='用户给出的候选名；本次缺少可核实的对应品饮资料。下文为选购核对建议，不是口碑结论。'
# Citation-backed original-list specials
s5=src('review-tap5','https://www.jiuhuar.com/craftbeer/5b4c6ddd8ba5b0c4548b456f.html','施耐德5号 · 酒花儿')
pending('tap5','施耐德5号','Schneider Weisse Tap 5','wheat','小麦博克 Weizenbock','德国',500,'酒花、小麦、浓郁','酒款资料显示8.2%酒精度、40 IBU，是强化酒花的小麦博克方向。','没有用酒花儿评分换算BA分数；没有把未核实的整组价格当单瓶价。','希望小麦与较强酒花同时出现。',s5,abv=8.2,alias='施纳德5号')
sd=src('review-dajiu','https://www.jiuhuar.com/craftbeer/68307d54fdbf070d8902b2bb.html','大九酿造·降临 · 酒花儿','review','page')
pending('dajiu','大九酿造·降临','Dajiu · Advent','hoppy','浑浊 IPA','中国',500,'柑橘、热带果香、酒花','检索评价常提到柑橘、百香果与菠萝感，也有尾段涩和酒花辛辣的反馈。','酒花儿约3.71/5不与BA直接混用；国内同规格实价未核实。','尝试国产浑浊IPA；先少量试口味。',sd,alias='大九 降临')
ss=src('review-salt','https://www.gcores.com/talks/226312','牛啤堂帝都海盐 · 用户品饮记录','review','search-index')
pending('salt','牛啤堂·帝都海盐','NBeer Imperial City Gose','sour','古斯 Gose','中国',330,'轻酸、淡盐、清爽','单条品饮记录描述轻乳酸、淡盐感和较低苦味。','这不是大样本一致口碑；不同水果变体不能套原味。价格、BA评分尚缺。','对咸酸风味好奇的人。',ss,alias='帝都海盐 牛啤堂')
sp=src('official-primator','https://primator.cz/en/pivovar/historie/','Primátor 酒厂历史','official','page')
pending('primator','捷皇小麦白啤','Primátor Weizenbier','wheat','德式小麦 Hefeweizen','捷克',500,'小麦风格','酒厂位于捷克；“德式小麦”是风格称呼。历史奖项不能代替现在批次的评价。','国内价格、同源平均分未核实。不能用“德式三巨头”口号代替证据。','把它作为传统小麦的待比价候选。',sp,alias='捷皇 Primator')
pending('snow','沈阳老雪花','Snow · Laoxue','lager','拉格（具体版本待核对）','中国',640,'拉格','找到640ml×12瓶、56.5元的报价记录，适合先比较整单支出和实际规格。','本次没有同源口碑分；不把“劲大”当品质指标，也不把原麦汁浓度当酒精度。','以低预算为先，并确认自己喜欢这个具体版本。',P['snow']['sourceId'],quote=P['snow'],alias='老雪 老雪花')
sfat=src('report-pang','https://finance.youth.cn/finance_yw/202404/t20240415_15197147.htm','胖东来啤酒零售与转售现象 · 中国青年网','report','page','2024-04-15')
pending('pang','胖东来精酿小麦啤酒','Pang Dong Lai Wheat Beer','wheat','小麦啤酒（版本待核对）','中国',330,'小麦风格','媒体记录过原价与转售价格差异。先看具体型号、容量和实际到手价，不为网红标签多付钱。','本次未完成当前同规格售价复核，不沿用上一轮2.5元作为今天报价；没有可比BA分。','能拿到低加价渠道、且喜欢其口味的人。',sfat,alias='胖东来 小啤酒')
for args in [
 ('asahi','朝日超爽 · 国产经典','Asahi Super Dry · China','lager','干型拉格','中国',500,'不要用进口版、食彩或全开盖罐价格代替国产经典。','朝日 Asahi'),
 ('tsingtao-white','青岛全麦白啤','Tsingtao Wheat Beer','wheat','小麦啤酒（版本待核对）','中国',500,'先确认是否全麦白啤、包装容量与产地；没有拿其他青岛产品评分替代。','青岛白啤'),
 ('augerta','青岛奥古特 / A3 待分型','Tsingtao Augerta','lager','拉格（版本待核对）','中国',500,'原版奥古特与全麦A3不能视为同一个SKU；填写价格前先确认。','奥古特 A3'),
 ('heineken-can','喜力绿罐 · 国产经典','Heineken Original · Can / China','lager','淡色拉格（具体产地待核对）','中国',500,'同为经典款也要核实产地；不能从包装直接断言比绿瓶好或差。','喜力绿罐'),
 ('heineken-bottle','喜力绿瓶 · 国产经典','Heineken Original · Bottle / China','lager','淡色拉格（具体产地待核对）','中国',None,'瓶装有不同容量，不能拿330ml和500ml直接比“每瓶价”。','喜力绿瓶'),
]:
 id,name,en,fam,style,country,ml,caution,alias=args
 pending(id,name,en,fam,style,country,ml,'待补资料','已保留你的候选；本次没有取得足够的同规格价格与独立口碑资料。',caution,'先确认SKU，再记录实付总价与容量。',alias=alias)
sh=src('official-keg','https://www.heineken.com/ph/en/our-products/draught-keg','喜力5L Draught Keg · 官方','official','page')
pending('heineken-keg','喜力金刚桶 5L','Heineken Draught Keg','lager','淡色拉格','荷兰',5000,'打酒体验','官方介绍为带内置二氧化碳压力系统的5L桶装，差异主要在使用体验。','未取得当前大陆报价，也不把瓶罐评分直接当桶装独立评价；5L不是建议一次饮用量。','看重聚会打酒体验，而非单纯追求酒液低价。',sh,alias='铁金刚 金刚桶')
pending('nadu','“纳德” · 名称待确认','Unresolved name','unresolved','待确认','待确认',None,'待确认','无法唯一对应具体酒款，没有强行认作施纳德。','需补品牌外文、编号或瓶身；不让不明确实体进入任何前沿。','先确认酒名。',identity=True)
pending('dream','沙坡尾梦小姐 · 版本待确认','Shapowei Miss Dream · version needed','sour','待确认','中国',None,'待确认','同一系列名称不足以确定具体配方和规格。','需要完整款名；不把不同水果或酒精度版本混为一款。','先提供具体罐身版本，再补价格和口碑。',identity=True)
sph=src('official-pohjala','https://pohjalabeer.com/','Põhjala 酒厂官网','official','page')
pending('pohjala','珀亚拉 · 请指定酒款','Põhjala Brewery','unresolved','待确认','爱沙尼亚',None,'酒厂不是酒款','珀亚拉是酒厂，产品横跨多个风格，不能给整个品牌一个统一酒款评分。','先选具体酒名；常规世涛与桶陈款不应共用价格。','按具体产品补充，不按品牌盲买。',sph,alias='伯亚拉 珀亚拉 爱沙尼亚',identity=True)
# More source detail for user navigation, not silently used for a different SKU.
src('weihen-product','https://wiki.smzdm.com/p/yn7543w/','维森500ml×6商品条目（描述有原味/水晶白歧义）','price','search-index',note='与品牌聚合价格交叉核对；SKU歧义已在该报价中标注。')
src('official-rochefort10','https://www.trappistes-rochefort.com/zh-hans/beer/rochefort-10/','罗斯福10 · 官方规格','official','page')
src('review-breakfast-panel','https://www.beerandbrewing.com/review/breakfast-stout','Founders Breakfast Stout · Craft Beer & Brewing 品饮','review','page','2017-01-11')
for b in beers:
 if b['id']=='breakfast': b['review']['sourceIds'].append('review-breakfast-panel')
 if b['id']=='weihen': b['review']['sourceIds'].append('weihen-product')
 if b['id']=='rochefort10': b['review']['sourceIds'].append('official-rochefort10')
# Reference quantities are source packs. null means unknown, never zero.
data={'schemaVersion':1,'meta':{'title':'啤酒前沿','english':'BEER FRONTIER','snapshotDate':DATE,'currency':'CNY','market':'中国大陆零售参考样本','scorePlatform':'BeerAdvocate','scoreScale':5,'scope':'代表性候选集，不是所有啤酒、所有渠道或全市场最优。','pricePolicy':'没有实时结算验证价格。所有外部价格均为参考样本；年份未知不等于新价。已知旧价和规格有歧义的样本默认不参与。','reviewPolicy':'品饮文本是公开评价的简短归纳，适合人群为编辑判断；未进行实物盲测。'},'families':{'all':{'name':'全部风格','color':'#d06337'},'wheat':{'name':'小麦 / 白啤','color':'#bd8b31'},'lager':{'name':'拉格 / 皮尔森','color':'#587864'},'belgian':{'name':'比利时艾尔','color':'#916045'},'hoppy':{'name':'酒花 / IPA','color':'#788541'},'dark':{'name':'世涛 / 深色','color':'#64516d'},'sour':{'name':'酸啤 / 果味','color':'#b46c76'},'unresolved':{'name':'名称待确认','color':'#88827a'}},'beers':beers,'sources':sources}
(ROOT/'data/beers.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Curated',len(beers),'beers;',sum(b['rating'] is not None for b in beers),'BA ratings;',sum(b['quote'] is not None for b in beers),'price samples;',len(sources),'sources')
