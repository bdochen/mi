/*=========================================================================
indidocx相关函数
2012-02-28  sunxz  silverlight 版本控件相关函数
=========================================================================*/

var slCtl; //控件对象
var dlgTaoDa; //套打dialog
var dlgCreateFromTemplate; //红头创建dialog
var dlgGaiZhang; //盖章dialog
var dlgWebPaint; //手写dialog
var dlgSaveFiles;//批量下载dialog
var dlgWebScan;//扫描dialog
var blnMultiSaveEvent=false;//批量下载or单个文件下载
var blnHAFileUploaded=false; //手写意见是否上传了
var blncanmovefile=false; //能否附件进行排序
var blnFileLockedOnServer=false;  //服务器端是否有附件锁定

dojo.require("smartdot.IframeDialog");
dojo.addOnLoad(function(){
	setTimeout(showFilesWithOutPlugin,2000);
})
/**
 * pluginloaded()
 *『函数功能』
 * 	sl_indidocx 加载时调用，声明事件处理函数
 */
function pluginloaded(sender) {

	slCtl= document.getElementById("wfeditor"); 

	showFiles(null,"pluginloaded");
	slCtl.Content.Files.FileUploadDoing=showFiles; //声明附件上传中事件，调用showFiles
	slCtl.Content.Files.SingleFileUploadFinished=showFiles; //附件上传完毕
	slCtl.Content.Files.FileDeleted=showFiles;	//删除附件完毕
	slCtl.Content.Control.FileAdded=showFiles; //痕迹文件原始稿文件添加成功事件
	slCtl.Content.Control.ActionEnd=closeDiv;  //打开word
	slCtl.Content.Control.SingleFileDownloaded=SaveFileCompleted;  //下载结束后给出提示
	//已转至oaconfig中配置。
	//slCtl.Content.Control.UseStaticPassword(false);//安证通集成，或者indidocx4.1.0.x版本控件升级，需要改成true

}

/**
 * showDiv()
 *『函数功能』
 * 	创建一个div，遮住附件区域
 */
function showDiv(){
	var pos=getPos();
	var busydiv = document.getElementById("busydiv");
	if(!busydiv){
		var busydiv=document.createElement("div"); 
		document.body.appendChild(busydiv);
	}
	busydiv.style.position="absolute"; 
	busydiv.style.top=pos.y+"px"; 
	busydiv.style.left=pos.x+"px"; 
	busydiv.style.height=pos.h+"px"; 
	busydiv.style.width=pos.w+"px"; 
	busydiv.style.zIndex="100"
		busydiv.style.backgroundColor="#ffffff" 
			busydiv.id="busydiv"  
				var mg=parseInt(pos.h*0.5)-18>0?parseInt(pos.h*0.5)-18:0
						busydiv.innerHTML="<div style='margin:"+mg+"px 20px'>系统正在准备，请稍候......</div>"

						busydiv.style.display="block"

}
/**
 * closeDiv()
 *『函数功能』
 * 	关闭div，显示附件区域
 */
function closeDiv(){

	var busydiv = document.getElementById("busydiv");
	if(busydiv)
		busydiv.style.display="none"
}
/**
 * getPos()
 *『函数功能』
 * 	计算附件区域的长宽以及坐标
 */
function getPos(){
	var divfile= dojo.query(".indidocx-files-table")[0];
	var width = divfile.offsetWidth; 
	var height = divfile.offsetHeight; 
	var left = 0; 
	var top =0;

	while ( divfile.offsetParent ) { 
		left += divfile.offsetLeft; 
		top  += divfile.offsetTop; 
		divfile = divfile.offsetParent; 
	} 
	return {x:left,y:top,w:width,h:height}
}
/**
 * parseNameCommon()
 *『函功能』
 * 	根据给定人名的abbreviate格式字符串，获取其common格式
 *『函数参数』
 *	参数名	类型		含义
 *	str		String	需要进行处理的人名字符串
 *『返回值说明
 *	类型		含义
 *	String	处理后的人名common格式
 */
function parseNameCommon(str)
{
//	通过Abbreviate name获得显示的用户名
	//return str;
	str = str.replace(/;|\^/g,",");
	var astrName = str.split(",");
	var strResult = "";
	for(var i=0;i<astrName.length;i++)
	{
		strResult += (strResult==""?"":",") + canonicalizeToAbbreviates(astrName[i].split("/")[0]);
	}
	return strResult;
}
/**
 * isIdxPluginInstalled()
 *『函数功能』
 * 	控件是否可用
 */
function isIdxPluginInstalled(){
	if( typeof(dojo)!="undefined" ){
		if(dojo.isMobile){
			return false
		}
	}
	var obj=document.getElementById("wfeditor"); 
	if(obj){
		try{
			obj.Content.Control.getVersion()
		}catch(e){
			return false;
		}
		return true
	}else{
		return false
	}

}
/**
 * isDealer()
 *『函数功能』
 * 	当前用户是否是处理人
 */
function isDealer(strCuser,strDealers){
	var arrDealers=strDealers.split(",");
	//2012-12-10 add.该域在sfrmWebFileEditor中，通过查找此域来判断文档是否在编辑状态	
	if(!document.getElementsByName("filename_gaizhang")[0]){
		return false;
	}
	return dojo.some(arrDealers,function(dealer){
		return dojo.trim(strCuser)==dojo.trim(dealer)
	})
}
/**
 * initFiles()
 *『函数功能』
 * 	初始化附件数组，按顺序
 */
function initFiles(strFileIndex,arrFilesInCtrl){
	//add by sunxz 2012-10-24 因增加了重命名功能，所以savefileindex中记录的是19位unid.此处做兼容

	//strFileIndex域中记录了附件为A|B|C|D，控件中的为C，B，D，E，F，最终的顺序应为BCDEF
	var arrFileIndex=strFileIndex.split("|");
	var arrSortedFiles=new Array();
	var blnIsUnid=false;
	//判断strFileIndex中记录的是unid还是filename.unid是19位的。filename都有后缀。
	if(arrFileIndex[0]&&arrFileIndex[0].indexOf(".")==-1){
		blnIsUnid=true;
	}

	if(isIdxPluginInstalled()){
		if(!blnIsUnid){
			dojo.forEach(arrFileIndex,function(fldfilename){
				//先看strFileIndex域里面记的附件名称，在控件是否存在，添加存在的
				var objCtlFile=slCtl.Content.Control.getFileByName(fldfilename)
				if (objCtlFile!=null){
					arrSortedFiles.push(objCtlFile)
				}
			});
			dojo.forEach(arrFilesInCtrl,function(objCtlFile){
				//再看控件数组中的附件是否存在于strFileIndex域中。添加不存在的
				if(!dojo.some(arrFileIndex,function(filename){return filename==objCtlFile.FileName})){
					arrSortedFiles.push(objCtlFile)
				}
			});
		}else{
			dojo.forEach(arrFileIndex,function(fldfileunid){
				//先看strFileIndex域里面记的附件名称，在控件是否存在，添加存在的
				var objCtlFile=slCtl.Content.Control.getFileByUnid(fldfileunid)
				if (objCtlFile!=null){
					arrSortedFiles.push(objCtlFile)
				}
			});
			dojo.forEach(arrFilesInCtrl,function(objCtlFile){
				//再看控件数组中的附件是否存在于strFileIndex域中。添加不存在的
				if(!dojo.some(arrFileIndex,function(fileunid){return fileunid==objCtlFile.Unid})){
					arrSortedFiles.push(objCtlFile)
				}
			});
		}
	}else{
		if(!blnIsUnid){
			dojo.forEach(arrFileIndex,function(filename){
				//先看strFileIndex域里面记的附件名称，在控件是否存在，添加存在的
				dojo.forEach(arrFilesInCtrl,function(objCtlFile){
					if( filename==objCtlFile.FileName)
						arrSortedFiles.push(objCtlFile)
				})

			});
			dojo.forEach(arrFilesInCtrl,function(objCtlFile){
				//再看控件数组中的附件是否存在于strFileIndex域中。添加不存在的
				if(!dojo.some(arrFileIndex,function(filename){return filename==objCtlFile.FileName})){
					arrSortedFiles.push(objCtlFile)
				}
			});
		}else{
			dojo.forEach(arrFileIndex,function(fileunid){
				//先看strFileIndex域里面记的附件名称，在控件是否存在，添加存在的
				dojo.forEach(arrFilesInCtrl,function(objCtlFile){
					if( fileunid==objCtlFile.Unid)
						arrSortedFiles.push(objCtlFile)
				})

			});
			dojo.forEach(arrFilesInCtrl,function(objCtlFile){
				//再看控件数组中的附件是否存在于strFileIndex域中。添加不存在的
				if(!dojo.some(arrFileIndex,function(fileunid){return fileunid==objCtlFile.Unid})){
					arrSortedFiles.push(objCtlFile)
				}
			});
		}
	}

	return arrSortedFiles;

}
/**
 * showFiles()
 *『函数功能』
 * 	显示附件列表及操作图标
 */
function showFiles(sender, args){
	//console.log("11");
	var files=slCtl.Content.Files;

	var userFile;
	var i = 0;
	var mbsize=0; 
	var strZw="";
	var strFj="";
	var flowdefeditable=document.forms[0].flowdef_idxeditable.value //流程定义配置是否能编辑idx
	var flowdefidxqinggao=document.forms[0].flowdef_idxqinggao.value
	var flowdefidxtaoda=document.forms[0].flowdef_idxtaoda.value
	var flowdefidxgaizhang=document.forms[0].flowdef_idxgaizhang.value
	var flowdefidxdel =document.forms[0].flowdef_idxdel.value

	//Add by liuxiaoyong
	var flowdef_idxisxz;
	if(document.forms[0].flowdef_idxisxz){
		flowdef_idxisxz=document.forms[0].flowdef_idxisxz.value
	}
	//End Add

	var curuser=document.forms[0].idx_curuser.value;
	var ismanager=document.forms[0].is_manager.value;
	if(document.forms[0].alldealer1){
		var alldealer=document.forms[0].alldealer1.value;
		var blnisdealer=isDealer(curuser,parseNameCommon(alldealer))
	}
	var objFileIndex=document.forms[0].idx_filename_index;
	var strFileIndex=objFileIndex?objFileIndex.value:"|";


	if(blnisdealer&&(dojo.query(".indidocx-fileAddBar")[0]!=undefined||flowdefidxqinggao=="true"||flowdefidxtaoda=="true")){
		//可以添加附件的环节，清稿环节，套打环节可以排序
		blncanmovefile=true
	}

	var list = "<table width='100%' cellspacing='0' cellpadding='0' border='0'>";
	list += "<colgroup>";     //14个
	list += "<col width='32'><col width='auto'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'>"
		list += "</colgroup>";

	//by sunxz 2012-5-10初始化排序数组

	var arrSortedFiles=initFiles(strFileIndex,files.FileList)

	//Add by liuxiaoyong
	var strtmp;
	var tmpvar;
	var fjans = 0;
	var strFjqx = '';
	var creator;
	var fjunid;
	var iszd = '';
	var issc = '';
	var isxz = '';
	var intCols = 0;
	//End Add

	var intFilesShown=0;
	var count = 0;
	for(i=0;i<arrSortedFiles.length;i++){
		userFile = arrSortedFiles[i];

		//Add by liuxiaoyong
		creator = userFile.CreateInfo.split(" ")[0];
		fjunid = userFile.Unid;
		var iseditfis = false;
		if(curuser==creator && document.getElementsByName("flowdef_idxeditable")[0].value=="true"){
			iseditfis = true;
		}
		if(dojo.byId("tmpFjqxList")){
			strFjqx = dojo.byId("tmpFjqxList").value;
		}else{
			strFjqx = dojo.byId("strFjqxList").value;
		}
		iszd = '';
		issc = '';
		isxz = '';
		if(strFjqx.indexOf(fjunid)!=-1){
			strtmp = strFjqx.substr(strFjqx.indexOf(fjunid)+fjunid.length+1,5);
			if(strtmp!=""){
				tmpvar = strtmp.split(",");
				iszd = tmpvar[0];
				issc = tmpvar[1];
				isxz = tmpvar[2];
			}
		}
		//End Add

		//系统保留： 附件0;	正文-1;手写批示png-2	;痕迹-3;	原始稿-4;意见附件-5,会签图片附件-6，扫描附件-7
		if (parseInt(userFile.CatNum)==-2||parseInt(userFile.CatNum)==-5||parseInt(userFile.CatNum)==-6) 
			continue;


		count++;
		//2012-10-08 add by sunxz 附件个数>1，显示批量下载按钮
		var objSpanSMF=dojo.byId("spanSaveMultiFiles");
		if(++intFilesShown>1){
			if(!!objSpanSMF){
				objSpanSMF.style.display="inline";
				if(!dojo.query(".indidocx-fileAddBar")[0]){
					objSpanSMF.style.margin="auto 2%"
						objSpanSMF.style.padding="6px"
				}
			}	  
		}else{
			if(!!objSpanSMF){
				objSpanSMF.style.display="none";
			}	  
		}
		var intColspan=1;
		var tmpstr1="<tr>";
		var tmpstr2="";
		var tmpstr3="";
		//正文or附件图标	
		if (parseInt(userFile.CatNum)==-1){
			tmpstr1+="<td class='filetype_zw'></td>";
		}else{
			tmpstr1+="<td class='filetype_fj'></td>";
		}


		//上传到服务器完毕，  Completed==1。否则显示进度。
		//doAdd=true，标示是程序自动添加了痕迹高和原始稿。
		if (userFile.Completed==0&&!userFile.doAdd){ 
			tmpstr2 += "<td colspan='13'><font>正在上传...</font>(" + userFile.FileName + ")</td>";
		}else{

			//td清稿
			if (blnisdealer&&userFile.AllowOnlineEdit&&userFile.CatNum==-1&&flowdefidxqinggao=="true"){
				tmpstr3 +="<td><a class='idx_qinggao' title='清稿' onClick="QingGaoFile('"+userFile.FileName+"')"></a></td>";
			}else{
				intColspan=intColspan+1;//tmpstr3 += "<td></td>";
			}

			//td套打or套打撤回
			if (blnisdealer&&userFile.AllowOnlineEdit&&userFile.CatNum==-1&&flowdefidxtaoda=="true"){
				tmpstr3 +="<td><a class='idx_taoda' title='套打' onClick="TaoDaFile('"+userFile.FileName+"')"></a></td>";
			}else if(blnisdealer&&userFile.CatNum==-4&&flowdefidxtaoda=="true"){

				tmpstr3 +="<td><a class='idx_reverttaoda' title='套打撤回' onClick="RevertTaoDaFile('"+userFile.Unid+"')"></a></td>";
			}else{
				intColspan=intColspan+1;//tmpstr3 += "<td></td>";
			}

			//td盖章
			if (blnisdealer&&userFile.AllowOnlineEdit&&userFile.CatNum==-1&&flowdefidxgaizhang=="true"){
				tmpstr3 +="<td><a class='idx_gaizhang' title='盖章' onClick="GaiZhangFile('"+userFile.FileName+"')"></a></td>";
			}else{
				intColspan=intColspan+1;//tmpstr3 += "<td></td>";
			}

			//tdX2 锁定状态+解锁
			//Modify by liuxiaoyonog
			if ((iszd!="1" || iseditfis)&&userFile.LockUser!="0"){
				//End Modify
				blnFileLockedOnServer=true;
				tmpstr3+="<td><a class='idx_locked' title='"+userFile.LockUser +"锁定'>  </a></td>"
				if(userFile.LockUser==curuser||ismanager=="true")
					tmpstr3+="<td><a class='idx_unlock' title='解锁' onClick="fnUnlockFile('"+userFile.FileName+"',false)"></a></td>"
					else
						intColspan=intColspan+1;//tmpstr3+="<td></td>"
			}else{
				intColspan=intColspan+2;//tmpstr3+="<td></td><td></td>";		
			}


			//td打印
			//Modify by liuxiaoyonog
			if ((iszd!="1" || iseditfis)&&userFile.AllowPrint){
				//End Modify
				tmpstr3 += "<td><a class='idx_print' title='打印' onClick="PrintFile('"+userFile.FileName+"',true)"></a></td>";

			}else{
				intColspan=intColspan+1;//tmpstr3+="<td></td>"; 
			}


			//td删除
			//Modify by liuxiaoyong
			if((iszd!="1" || iseditfis)&&flowdefeditable=="true"){
				if ((issc!="1" || iseditfis)&&flowdefidxdel=="true"){
					//End Modify
					//if (flowdefidxdel=="true"){
					tmpstr3 += "<td><a class='idx_delete' title='删除' onClick="DelFile('"+userFile.FileName+"')"></a></td>";
				}else{
					//如果当前用户是处理人，且附件不在arrSubmitedFiles（存储了以前的环节在的附件排序）中，说明是刚传的还没提交表单，可以删除，不用管配置。
					if(document.forms[0].strFileIndex){
						var arrSubmitedFiles=document.forms[0].strFileIndex.value.split("|");
						//dojo.some中的return，因为加入重命名功能后，strFileIndex从记录文件名变成记录unid，因此这里要兼容历史文档，即比较name，又比较unid。
						if(blnisdealer&&!dojo.some(arrSubmitedFiles,function(filename){return (filename== userFile.FileName|filename== userFile.Unid)})){
							tmpstr3 += "<td><a class='idx_delete' title='删除' onClick="DelFile('"+userFile.FileName+"')"></a></td>";
						}else{
							intColspan=intColspan+1;// tmpstr += "<td></td>"; 
						}
					}else{
						intColspan=intColspan+1;// tmpstr += "<td></td>"; 
					}
				}
			}else{
				intColspan=intColspan+1;//tmpstr += "<td></td>";
			}

			//显示排序按钮
			//Modify by liuxiaoyong
			if((iszd!="1" || iseditfis)&&blncanmovefile){	
				//End Modify
				if(parseInt(userFile.CatNum)!=-1){
					tmpstr3 +="<td><a class='idx_up' 	title='向上移动' onClick="MoveFile(event)"></a></td>";
					tmpstr3 +="<td><a class='idx_down' title='向下移动' onClick="MoveFile(event)"></a></td>";
				}else{
					intColspan=intColspan+2;//tmpstr3+="<td></td><td></td>";
				}
			}else{
				intColspan=intColspan+2;//tmpstr3+="<td></td><td></td>";
			}

			//td改名
			//Modify by liuxiaoyong
			if ((iszd!="1" || iseditfis)&&blnisdealer){
				//End Modify
				tmpstr3 +="<td><a class='idx_rename'	title='重命名' id='a_rename_"+userFile.Unid+"' onClick="ReName('"+userFile.FileName+"')"></a></td>"; 			
			}else{
				intColspan=intColspan+1;//tmpstr3+="<td></td>";
			}

			//设置能否编辑
			//zhaolk  2013-9-25-chentao--修改

			var canSetEdit = document.getElementsByName("canSetEdit")

			//Modify by liuxiaoyong
			if((iszd!="1" || iseditfis)&&canSetEdit.length>0){
				//End Modify
				if(canSetEdit[0].value == "true"){
					tmpstr3 += "<td><a class='idx_edit' title='设置可编辑'   id='tdedit_"+userFile.Unid+"' href="javascript:setEdit('"+userFile.Unid+"')"></a></td>";
					tmpstr3 += "<td><a class='idx_noedit' title='设置不可编辑'   id='tdnoedit_"+userFile.Unid+"' href="javascript:setnoEdit('"+userFile.Unid+"')"></a></td>";  
				}
				else{
					tmpstr3+="<td></td><td></td>"; 
				}
			}else{
				tmpstr3+="<td></td><td></td>";
			}

			//-----------------
			//td修订记录
			tmpstr3 +="<td><a class='idx_filelog' title='修订记录'   id='tdlog_"+userFile.Unid+"' onClick="Viewlog('"+userFile.FileName+"')"></a></td>";

			//td下载
			//Modify by liuxiaoyong
			//if(iszd!="1"&&(isxz!="1"&&flowdef_idxisxz=="true")){
			//if(isxz!="1"&&flowdef_idxisxz=="true"){ //modify by daiminbo
			tmpstr3 +="<td><a class='idx_download' title='下载' onClick="SaveFile('"+userFile.FileName+"')"></a></td>";
			//}else{
			// tmpstr3 +="<td></td>";
			//}
			//End Modify

			//td名称
			mbsize=getStrSize(userFile.Size);
			tmpstr2= "<td colspan='"+intColspan+"'><a title='"+userFile.FileName+"' fname='"+userFile.FileName+"' funid='"+userFile.Unid+"'  onClick="OpenMyFile('"+userFile.FileName+"')"><font>" + userFile.FileName + "(" + mbsize + ")</font></a></td>";


		}
		tmpstr3+="</tr>";   

		if (userFile.CatNum==-1){
			strZw=tmpstr1+tmpstr2+tmpstr3;
		}else{
			strFj+=tmpstr1+tmpstr2+tmpstr3;

			//Add by liuxiaoyong
			if(intCols==0){
				intCols=intColspan;
			}
			if(fjans==0){
				tmpvar = strFj.split("<td>");
				fjans = tmpvar.length-1;
			}
			if(curuser==creator && fjans>0 && document.getElementsByName("flowdef_idxeditable")[0].value=="true"){
				tmpvar = "<tr><td></td>";
				tmpvar += "<td colspan='"+intCols+"'></td>";
				tmpvar += "<td colspan='"+fjans+"' align='right'><div width='98%' style='padding-right:10px;float:right;'>";
				if(iszd=="1"){
					strtmp="checked"
				}else{
					strtmp="";
				}
				tmpvar += "<label><input id='fjqx_read' onclick='updatafjqx(""+fjunid+"","zd");' type='checkbox' "+strtmp+"/>只读</label>";
				if(issc=="1"){
					strtmp="checked"
				}else{
					strtmp="";
				}
				tmpvar += "&nbsp;&nbsp<label><input id='fjqx_del' onclick='updatafjqx(""+fjunid+"","sc");' type='checkbox' "+strtmp+"/>不可删除</label>";
				if(isxz=="1"){
					strtmp="checked"
				}else{
					strtmp="";
				}
				tmpvar += "&nbsp;&nbsp<label><input id='fjqx_down' onclick='updatafjqx(""+fjunid+"","xz");' type='checkbox' "+strtmp+"/>不可下载</label>";
				tmpvar += "</div></td></tr>";
				strFj = strFj + tmpvar;
			}
			//End Add
		}
	} 
	list+=strZw;
	list+=strFj;
	list += "</table>"
		//by tianxy  Modify 2015-08-06 
		if(dojo.query(".indidocx-files-table")[0]){
			dojo.query(".indidocx-files-table")[0].innerHTML = list;
		}
	//end modify
	window._INDIDOCCOUNT = count;
	if(window._FTPCOUNT!==undefined && window._INDIDOCCOUNT!==undefined){
		if((_FTPCOUNT+_INDIDOCCOUNT)>0) addPanelCount(_FTPCOUNT+_INDIDOCCOUNT,dojo.query('.indidocx-files-table').closest('.panel'));
	}

	if (dojo.byId("Idx_All_Attach_5")){
		if (typeof fnGetTmpAttach5 === "function"){
			fnGetTmpAttach5();
		}
	}

	closeDiv();
	//by sunxz add 2012-5-10,如果不是上传中事件,控件初始化事件,重命名事件，则记录排序
	if(String(args)!="WebFileEditor.lib.FileUploadPercentEventArgs"&&String(args)!="pluginloaded"&&String(args)!="rename"){
		SaveFileIndex();
	}


}

//Add by liuxiaoyong
function updatafjqx(fjunid,flag){
	var strFjqx = dojo.byId("tmpFjqxList").value;
	var oldvalue;
	var newvalue;
	var strtmp;
	if(strFjqx.indexOf(fjunid)!=-1){
		strtmp = strFjqx.substr(strFjqx.indexOf(fjunid)+fjunid.length+1,5);
		oldvalue = fjunid+":"+strtmp+";";
		if(strtmp!=""){
			tmpvar = strtmp.split(",");
			if(flag=="zd"){
				if(tmpvar[0]=="1"){
					tmpvar[0]="0";
				}else{
					tmpvar[0]="1";
				}
			}
			if(flag=="sc"){
				if(tmpvar[1]=="1"){
					tmpvar[1]="0";
				}else{
					tmpvar[1]="1";
				}
			}
			if(flag=="xz"){
				if(tmpvar[2]=="1"){
					tmpvar[2]="0";
				}else{
					tmpvar[2]="1";
				}
			}
			strtmp=tmpvar[0]+","+tmpvar[1]+","+tmpvar[2];
			newvalue=fjunid+":"+strtmp+";";
		}else{
			newvalue=oldvalue;
		}
		strFjqx = strFjqx.replace(oldvalue,newvalue);
		dojo.byId("tmpFjqxList").value = strFjqx;
	}else{
		if(flag=="zd"){
			strtmp="1,0,0";
		}
		if(flag=="sc"){
			strtmp="0,1,0";
		}
		if(flag=="xz"){
			strtmp="0,0,1";
		}
		newvalue=fjunid+":"+strtmp+";";
		dojo.byId("tmpFjqxList").value += newvalue;
	}
}
//End Add
/**
 * showFilesWithOutPlugin()
 *『函数功能』
 * 	ipad,iphone等移动设备不能安装silverligth，从控件html中的initParams下的的fileinfos中提取信息显示附件列表
 * FileInfos=<!1!>EFD731524CCAFD4E48257A7C003225A6<file_unid>129923482879814453T</file_unid>
 * <file_name>modify.docx</file_name>
 * <file_size>233764</file_size>
 * <file_create>2012-09-17 17:38:07</file_create>
 * <file_update>2012-09-17 17:38:07</file_update>
 * <file_editmodel>0</file_editmodel>
 * <file_lockuser>0</file_lockuser>
 * <CreateInfo>admin 2012-09-17 17:38:07</CreateInfo>
 * <UpdateInfo>admin于2012-09-17 17:38:07创建.</UpdateInfo>
 * <CatNum>-1</CatNum><Ext></Ext>
 * <doc_unid>59F9F10B8774931748257A7C00322ACB</doc_unid></!1!>
 */
function showFilesWithOutPlugin(){

	if(isIdxPluginInstalled()){
		return ;
	}

	if(dojo.query(".indidocx-fileAddBar")[0])dojo.query(".indidocx-fileAddBar")[0].style.display="none";
	if(dojo.query(".sl_needinstall")[0])dojo.query(".sl_needinstall")[0].style.display="block";
	if(document.getElementById("indidocx-panel-wrap"))document.getElementById("indidocx-panel-wrap").style.display="block";

	slCtl= document.getElementById("wfeditor");
	if(slCtl!=null)
	{
		var strInitParams="";
		dojo.some(slCtl.children,function(paramobj){
			if(paramobj.name.toLowerCase()=="initparams"){
				strInitParams=paramobj.value;
				return true;
			}

		})

		var arrFiles=new Array();

		var i=1;
		var strFileTagStart="<!"+i+"!>";
		var strFileTagEnd="</!"+i+"!>";
		var posStart=strInitParams.indexOf(strFileTagStart)
		//初始化arrFiles数组，每一个值为类似于<!1!>....</!1!>的字符串。
		while(posStart>0){
			var posEnd=strInitParams.indexOf(strFileTagEnd)
			arrFiles.push(strInitParams.substring(posStart,posEnd+strFileTagEnd.length))
			i=i+1;
			strFileTagStart="<!"+i+"!>";
			strFileTagEnd="</!"+i+"!>";
			posStart=strInitParams.indexOf(strFileTagStart,posStart)

		}
		if(arrFiles.length==0){
			return ;
		}
		//初始化map数组，此数组等价于控件的slCtl.Content.Files.FileList;
		var strURLRoot=window.location.href;
		strURLRoot=strURLRoot.substring(0,strURLRoot.lastIndexOf(".nsf")+5);
		var arrFileMap =  dojo.map(arrFiles, function(onefile) {
			return {
				"FileName":getRef(onefile,0,"<file_name>","</file_name>"),
				"Unid":getRef(onefile,0,"<file_unid>","</file_unid>"),
				"CatNum":getRef(onefile,0,"<CatNum>","</CatNum>"),
				"Size":getRef(onefile,0,"<file_size>","</file_size>"),
				"Link":strURLRoot+getRef(onefile,0,"<doc_unid>","</doc_unid>")+"/$file/"+getRef(onefile,0,"<file_unid>","</file_unid>")+getFileType(getRef(onefile,0,"<file_name>","</file_name>"))
			}
		});
		//初始化排序数组
		//strFileIndex域中记录了附件为A|B|C|D，控件中的为C，B，D，E，F，最终的顺序应为BCDEF
		var objFileIndex=document.forms[0].idx_filename_index;
		var strFileIndex=objFileIndex?objFileIndex.value:"|";
		var arrSortedFiles=initFiles(strFileIndex,arrFileMap)


		var userFile;
		var i = 0;
		var mbsize=0; 
		var strZw="";
		var strFj="";

		var list = "<table width='100%' cellspacing='0' cellpadding='0' border='0'>";
		list += "<colgroup>";
		list += "<col width='32'><col width='auto'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'><col width='32'>";
		list += "</colgroup>";

		for(i=0;i<arrSortedFiles.length;i++){
			userFile = arrSortedFiles[i];
			//系统保留： 附件0;	正文-1;手写批示png-2	;痕迹-3;	原始稿-4;意见附件-5,会签图片附件-6，扫描附件-7
			if (parseInt(userFile.CatNum)==-2||parseInt(userFile.CatNum)==-5||parseInt(userFile.CatNum)==-6) 
				continue;

			var tmpstr="<tr>";
			//正文or附件图标	
			if (parseInt(userFile.CatNum)==-1)
				tmpstr+="<td class='filetype_zw'></td>";
			else
				tmpstr+="<td class='filetype_fj'></td>";
			//td名称
			mbsize=getStrSize(userFile.Size);
			if(dojo.isMobile){
				tmpstr += "<td colspan="13"><a target='_blank' href=""+userFile.Link+""><font>" + userFile.FileName + "(" + mbsize + ")</font></a></td>";
			}else{
				tmpstr += "<td colspan="13"><font>" + userFile.FileName + "(" + mbsize + ")</font></td>";
			}

			tmpstr+="</tr>";                
			if (userFile.CatNum==-1)
				strZw=tmpstr;
			else
				strFj+=tmpstr;
		}

		list+=strZw;
		list+=strFj;
		list += "</table>";
		dojo.query(".indidocx-files-table")[0].innerHTML = list;
	}
}


/**
 * OpenMyFile()
 *『函数功能』
 * 	附件打开函数，其中
 * slCtl.Content.Control.OpenFile 如果是word,,wps文件，则只读打开，如果是其他文件，原生态打开。此种模式打开的文件（如excel），即使修改了也不更新到服务器。
 * slCtl.Content.Control.EditFile word,wps 文件编辑，修订模式打开。此中模式打开的文件，修改后才会更新到服务器。
 */
function OpenMyFile(fname){

	showDiv();

	var userFile=slCtl.Content.Control.getFileByName(fname)
	var flowdefeditable=document.forms[0].flowdef_idxeditable.value //流程定义配置是否能编辑idx
	var filetaodanames = document.forms[0].idx_filename_taoda.value.split(";");
	var filegaizhangnames = document.forms[0].idx_filename_gaizhang.value.split(";");
	var curuser=document.forms[0].idx_curuser.value;
	var is_bfsp=document.forms[0].flowdef_bfsp.value //是否是并发审批
	var lockuser=""

		var bfsp_islocked=false    //如果是并发审批，附件已经被其他人锁住
		var is_taoda_file=false	//是否是套打过的文件，如果是，只读打开。
		var is_gaizhang_file=false //是否是盖过章文件，如果是，只读打开。
		var is_word=false		 //是否是word，wps文件，如果是，在并发环节需要锁定



		for (i=0;i<filetaodanames.length;i++){	
			if (dojo.trim(filetaodanames[i]) == dojo.trim(fname)){
				is_taoda_file=true	
			}
		}	

	for (i=0;i<filegaizhangnames.length;i++){	
		if (dojo.trim(filegaizhangnames[i]) == dojo.trim(fname)){
			is_gaizhang_file=true	
		}
	}	


	if(is_bfsp=="true"){
		var maindocunid=document.forms[0].idx_MID.value
		var fileunid=userFile.Unid
		lockuser=fnGetFileLockUser(maindocunid,fileunid)

	}

	if(userFile.Type.toLowerCase()==".doc"||userFile.Type.toLowerCase()==".docx"||userFile.Type.toLowerCase()==".wps")
		is_word=true

		if(userFile.AllowOnlineEdit){  //如果是可以编辑的office文件。痕迹稿，或者原始稿默认为false

			if(flowdefeditable=="true"){ //流程定义可编辑idx

				if(is_taoda_file||is_gaizhang_file){ //或者被套打过，或者被盖章过，
					slCtl.Content.Control.OpenFile(fname);
				}else{
					if(is_bfsp=="false"){ //不是并发审批，编辑模式打开
						//EditFile第二个参数为0，原生态打开（无保护，用于编辑红头模板，印章等），参数为1，打开时有修订保护。
						if(document.getElementsByName("idx_fileopenoriginal")[0]){
							slCtl.Content.Control.EditFile(fname,0);
						}else{
							slCtl.Content.Control.EditFile(fname,1);
						}
					}else{
						if(lockuser=="0"){ //lockuser是空，说明未被他人打开，修订模式打开，加锁。
							slCtl.Content.Control.EditFile(fname,1);
							if(is_word){ //是word，wps，需要发送指令到服务器进行加锁。
								slCtl.Content.Control.LockAndUnlockFile(fname,true) //第二个参数为true，加锁，反之解锁
								blnFileLockedOnServer=true; //设置全局变量，标识当前有附件在服务器端加锁了。
							}

						}else{ //附件已经有锁，看是不是自己加的，如果不是，已经被他人编辑，只读打开。
							if(lockuser!=curuser){
								alert("当前附件正在被"+lockuser+"编辑，将以只读方式打开此附件。")
								slCtl.Content.Control.OpenFile(fname);
							}else{
								slCtl.Content.Control.EditFile(fname,1);
							}

						}
					}
				}

			}else{ //流程定义不可编辑，打开只读
				//--chentao-2013-9-25
				var fldCanEditDocUnid = document.getElementById("fldCanEditDocUnid");
				if(fldCanEditDocUnid){
					if(fldCanEditDocUnid.value.indexOf(userFile.Unid)!=-1){
						slCtl.Content.Control.EditFile(fname,1);
					}else{
						slCtl.Content.Control.OpenFile(fname);
					}
				}else{
					slCtl.Content.Control.OpenFile(fname);   				
				}
			}
		}else{
			slCtl.Content.Control.OpenFile(fname);
		}

}
/**
 * fnGetFileLockUser()
 *『函数功能』
 * 	OpenMyFile 调用，并发环节，查询当前附件文档中的querystring域中的file_lockuser值。
 *『函数参数』
 *	mmid	 附件所关联的主文档的maindocunid
 *	fid		 附件文档中记录fileunid，是附件的唯一标识
 */
function fnGetFileLockUser(mmid,fid){
	var strRt=""
		strUrl = "/" + document.forms[0].elements["dbPath1"].value + "/agtFindDocUnid?openagent&maindocunid=" +mmid+"&fileunid="+fid+"&querylockuser=true"

		var xhrArgs = {
			url: strUrl,
			handleAs: "text",
			sync: true,
			preventCache:true,
			load: function(strResult){
		var pos1 = strResult.lastIndexOf("<mydiv>");
		//从<mydiv>和</mydiv>之间获得最后的结果
		var pos2 = strResult.lastIndexOf("</mydiv>");
		if (pos1 != -1) 
			strRt= strResult.substring(pos1+7,pos2)
			else
				strRt= "DOCISNOTHING"
	},
	error: function(error){
	}
	} 
	dojo.xhrGet( xhrArgs );

	return strRt;

}
/**
 * fnUnlockFile()
 *『函数功能』
 * 	并发审批，页面销毁时（dojo.addOnWindowUnload(function(){fnUnlockFile("ALLMYLOCKFILE");});），或者用户or管理员手动点击时，解锁
 *『函数参数』
 *	fname	 附件名字
 *   async    解锁发送的ajax请求是否为异步，true,异步，页面销毁时调用；false，同步，点击提交或者手动点击解锁按钮。
 */
function fnUnlockFile(fname,async){

	//主文档unid
	var maindocunid=document.forms[0].idx_MID.value
	var curuser=document.forms[0].idx_curuser.value;
	var ismanager=document.forms[0].is_manager.value;
	var unlockuser="";
	if(async==undefined){ //dojo.addOnWindowUnload事件调用时不指定此参数。
		async=true;//缺省设置为异步。
	}
	if (fname=="ALLMYLOCKFILE"){ //页面销毁，dojo.addOnWindowUnload事件调用，or UploadIndiDocFiles 调用。解除当前用户所有附件的锁定
		fileunid="ALLMYLOCKFILE"
			unlockuser=encodeURI(curuser)
			if (blnFileLockedOnServer){ //如果服务器端有加锁的附件，解锁。
				ExcuteUnlockFile(maindocunid,fileunid,unlockuser,async);
				blnFileLockedOnServer=false;
			}

	}else{ //手动点击解锁，传过来fname，解除指定附件的锁

		var userFile=slCtl.Content.Control.getFileByName(fname)
		var fileunid=userFile.Unid
		if(ismanager=="true"){ //如果当前用户是管理员，可能是替别人解锁，要以那个人的身份去解锁
			unlockuser=userFile.LockUser
		}else{
			unlockuser=curuser
		}
		unlockuser=encodeURI(unlockuser)
		ExcuteUnlockFile(maindocunid,fileunid,unlockuser,async)
	}

}
/**
 * ExcuteUnlockFile()
 *『函数功能』
 * 	发送解锁请求。
 *『函数参数』
 *	mmid	 附件关联的主文档maindocunid
 *	fid 	 附件的fileunid,附件唯一标志。
 *	actionuser 谁要解锁，代理会根据此字段，寻找这个人锁定的附件文档。
 *   async    解锁发送的ajax请求是否为异步，true,异步，页面销毁时调用；false，同步，点击提交或者手动点击解锁按钮。
 */
function ExcuteUnlockFile(mmid,fid,actionuser,async){
	//主文档id，附件id，请求解锁的人,请求方式是否为异步

	strUrl = "/" + document.forms[0].elements["dbPath1"].value + "/agtClearFileLock?openagent&maindocunid="+mmid+"&fileunid="+fid+"&actionuser="+actionuser

	var xhrArgs = {
			url: strUrl,
			handleAs: "text",
			sync: !async,
			preventCache:true,
			load: function(strResult){
		if(fid!="ALLMYLOCKFILE"){
			var pos1 = strResult.lastIndexOf("<mydiv>");
			var pos2 = strResult.lastIndexOf("</mydiv>");
			if (pos1 != -1) {
				var res= strResult.substring(pos1+7,pos2)
				var msg=""
					if (res=="0"){
						msg="未找到附件，无法解除锁定!"
					}else{
						msg="解除锁定成功!"
					}	
				alert(msg)
				return true

			}else{
				return false
			}
		}

	},
	error: function(error){
	}
	} 

	dojo.xhrGet( xhrArgs );
}
/**
 * Viewlog()
 *『函数功能』
 * 	点击A标签，查询fname指定附件的流转日志。
 *『函数参数』
 *	fname	 附件名称
 */
function Viewlog(fname){
	var userFile=slCtl.Content.Control.getFileByName(fname)
	var tdid="tdlog_"+userFile.Unid;
	var arrlog=userFile.UpdateInfo.split(";")
	var strLog="";
	for(i=0;i<arrlog.length;i++){
		strLog+="<div>"+arrlog[i]+"</div>"
	}

	var tip = new dijit.Tooltip({  
		label: strLog,
		showDelay: 250,
		connectId: [tdid],
		onHide:function(){
		this.removeTarget(dojo.byId(tdid))
	}
	});
	tip.open(dojo.byId(tdid));

}
/**
 * DelFile()
 *『函数功能』
 * 	删除附件，异步删除服务器上的附件，成功后返回时间 slCtl.Content.Files.FileDeleted
 *『函数参数』
 *	fname	 附件名称
 */
function DelFile(fname){
	if(confirm("确定删除"+fname+"？"))
		slCtl.Content.Control.DeleteFile(fname);
	//ajax调用，生成删除日志
	var strCurDbPath=location.pathname
	var strwebseal=fnGetUrlRoot();
	strCurDbPath=strCurDbPath.substring(strwebseal.length,strCurDbPath.lastIndexOf(".nsf")+4)
	var strAppName=strCurDbPath.substring(0,strCurDbPath.indexOf("/"))
	var objDocId=document.getElementById("DocumentID")
	//刚起草的文件无此ID，故不记录
	if(objDocId){
		var strAddInfor = objDocId.value+"|"+strCurDbPath+"|"+fname
		var strUrl =strwebseal + strAppName+"/logdel.nsf/DeleteIndiDoc?openagent&strAttInfor="+encodeURI( strAddInfor );
		var xhrArgs = {
				url: strUrl,
				handleAs: "text",
				load: function(data){
		},
		error: function(error){
		}
		} 
		dojo.xhrGet( xhrArgs );

	}

}
/**
 * ReName()
 *『函数功能』
 * 	重命名附件。弹出重命名输入框。
 *『函数参数』
 *	fname	 附件名称
 */
function ReName(fname){

	var userFile=slCtl.Content.Control.getFileByName(fname)
	var fid=userFile.Unid;
	var aid="a_rename_"+fid;
	var dlgid="dlg_"+fid;
	var inputid="ipt_"+fid;
	var strHTML="<input id='"+inputid+"' style='width:100%;' value='输入新名称，不含后缀' onfocus='this.value=""'>"+
	"<div style='text-align:center'><span class='btn-action-key'><button type='button' dojoType='smartdot.form.Button'	onclick="ExcuteReName('"+fname+"')">确定</button></span>"+
	"<button type='button' dojoType='smartdot.form.Button'	onclick="CancelReName('"+fname+"')">取消</button></div>"
	if(!dijit.byId(dlgid))  { 		  
		var myTooltipDialog = new dijit.TooltipDialog({
			id: dlgid,
			style: "width: 220px;"
		});
	}
	dijit.byId(dlgid).setContent(strHTML);
	dijit.popup.open({
		popup: dijit.byId(dlgid),
		around: dojo.byId(aid)
	});

}
/**
 * ExcuteReName()
 *『函数功能』
 * 	重命名附件。指定重命名，隐藏弹出框。。
 *『函数参数』
 *	fname	 附件名称
 */
function ExcuteReName(fname){
	var userFile=slCtl.Content.Control.getFileByName(fname);
	var fid=userFile.Unid;
	var objinput=document.getElementById("ipt_"+fid);
	var objdlg=document.getElementById("dlg_"+fid);
	var newfilename=objinput.value+userFile.Type;
	dijit.popup.close(dijit.byId("dlg_"+fid));
	if(dojo.trim(objinput.value)!=""){
		var myReg = /[\/":<>|*]/;
		if(myReg.test(newfilename)){
			alert('文件名不能包含下列任何字符之一:
 \ / : * " < > |')
			return false
		} 
		slCtl.Content.Control.RenameFile(fname,newfilename);
		showFiles(null,"rename");
	}
}
/**
 * CancelReName()
 *『函数功能』
 * 	重命名附件。关闭弹出框。
 *『函数参数』
 *	fname	 附件名称
 */
function CancelReName(fname){

	var userFile=slCtl.Content.Control.getFileByName(fname)
	var fid=userFile.Unid;
	dijit.popup.close(dijit.byId("dlg_"+fid));

}
/**
 * PrintFile()
 *『函数功能』
 * 	附件打印。
 *『函数参数』
 *	fname	 附件名称
 *   mode true,提示选择打印机，falae，静默打印
 */
function PrintFile(filename,mode){
	if(confirm("确定打印"+filename+"？"))
		slCtl.Content.Control.PrintOut(filename,mode);
}

/**
 * MoveFile()
 *『函数功能』
 * 	附件排序，上移or下移
 *『函数参数』
 *	event，A标签的onclick事件传入
 */
function MoveFile(event){

	var e = getEvent();
	//a标签
	var eventsrcElecment = e.srcElement ? e.srcElement : e.target;
	//a标签所在tr
	var objSelTr=eventsrcElecment.parentNode.parentNode;
	//向上or向下
	var strMove=eventsrcElecment.className=="idx_down"?"after":"before";
	//被插入的tr
	var objDesTr;
	if(strMove=="before"){
		objDesTr=objSelTr.previousSibling;
		if(!objDesTr){
			alert("当前附件已经在最前!")
			return;
		}
		if(objDesTr.childNodes[0].className=="filetype_zw"){
			alert("当前附件已经在最前!")
			return;
		}

	}else{
		objDesTr=objSelTr.nextSibling;
		if(!objDesTr){
			alert("当前附件已经在最后!")
			return;
		}
	}
	dojo.place(objSelTr,objDesTr,strMove);
	SaveFileIndex();


}
/**
 * SaveFileIndex()
 *『函数功能』
 * 	记录排序后的附件顺序
 *『函数参数』
 **	isFormSubmit 	 表单提交时设置成true，以便更新strFileIndex域。
 *
 */
function SaveFileIndex(isFormSubmit){

	if(!blncanmovefile){
		return
	}
	if(!document.forms[0].idx_filename_index){
		return
	}
	var strFileIndex="";
	var strFileUnid="";
	//取到所有的附件icon所在的td，正文不参加排序
	var arrIconTds=dojo.query(".filetype_fj");
	//icon所在td的下一个相邻的td中，提取出A标签funid属性
	dojo.forEach(arrIconTds,function(iconTd){
		strFileUnid=iconTd.nextSibling.lastChild.getAttribute("funid")
		if(!!strFileUnid){
			strFileIndex+=strFileUnid+"|";
		}
	});
	var strZw=getZhengWen("unid");
	strFileIndex=(strZw==""?strFileIndex:strZw+"|"+strFileIndex);

	document.forms[0].idx_filename_index.value=strFileIndex;
	if(isFormSubmit){
		document.forms[0].strFileIndex.value=strFileIndex;
	}	
}

/**
 * SaveFile()
 *『函数功能』
 * 	下载到本地，服务器上存储的是什么状态（修订保护状态，or只读），下载下来就是什么状态。
 *『函数参数』
 *	fname	 附件名称
 */
function SaveFile(fname){
	blnMultiSaveEvent=false;
	slCtl.Content.Control.SaveFileToLocal(fname);
}
/**
 * fnShowSaveMultiFiles
 *『函数功能』
 * 	另存到本地，弹出附件多选层，如果传入参数，则关闭弹出层。。
 **/
function fnShowSaveMultiFiles(){

	//fnShowSaveMultiFiles(0) 层hide
	if(arguments.length>0){
		if(!!dlgSaveFiles){
			dlgSaveFiles.hide();
		}
		return true;
	}
	//Add by liuxiaoyong
	var fjunid;
	var iszd;
	var isxz;
	var strtmp;
	var strFjqx = '';
	if(dojo.byId("tmpFjqxList")){
		strFjqx = dojo.byId("tmpFjqxList").value;
	}else{
		strFjqx = dojo.byId("strFjqxList").value;
	}
	//End Add
	var strTableFiles="<table style='table-layout:fixed;width:400px'>"
		var strCheckBox="<input type='checkbox' name='chkidx_dl' checked>"
			var strStyleTd=" style='width:380px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;'"
				var strAttFname;
	var strFileName=getZhengWen();
	if (strFileName!=""){
		strTableFiles+="<tr><td style='width:20px'>"+strCheckBox+"</td><td"+strStyleTd+">"+strFileName+"</td></tr>";
	}
	var arrIconTds=dojo.query(".filetype_fj");
	dojo.forEach(arrIconTds,function(iconTd){
		//td->A,取到td中A标签所包含的文本
		strFileName=strFileUnid=iconTd.nextSibling.lastChild.getAttribute("fname");
		//Add by liuxiaoyong
		fjunid = iconTd.nextSibling.lastChild.getAttribute("funid");
		isxz = '';
		if(strFjqx.indexOf(fjunid)!=-1){
			strtmp = strFjqx.substr(strFjqx.indexOf(fjunid)+fjunid.length+1,5);
			if(strtmp!=""){
				tmpvar = strtmp.split(",");
				iszd = tmpvar[0];
				isxz = tmpvar[2];
			}
		}
		//End Add

		//Modify by liuxiaoyong
		if(iszd!="1"&&isxz!="1"){
			strAttFname=" fname='"+strFileName+"'"
			strTableFiles+="<tr><td style='width:20px'>"+strCheckBox+"</td><td"+strStyleTd+strAttFname+">"+strFileName+"</td></tr>";
		}
		//End Modify
//		strAttFname=" fname='"+strFileName+"'"
//		strTableFiles+="<tr><td style='width:20px'>"+strCheckBox+"</td><td"+strStyleTd+strAttFname+">"+strFileName+"</td></tr>";
	});
	strTableFiles+="</table>"

		if(strTableFiles.lastIndexOf("type='checkbox'")==-1){
			alert("没有附件可以下载！")
			return true;
		}

	var strHTML="<div style='width:400px;max-height:100px;overflow-x:hidden;overflow-y:auto;'>"+strTableFiles+"</div>"+
	"<div style='width:100%;text-align:center'>"+
	"<span class='btn-action-key'><button type='button' onClick='SaveMultiFiles();' dojoType='smartdot.form.Button'>确定</button></span>"+
	"<button type='button' dojoType='smartdot.form.Button' onClick='return fnShowSaveMultiFiles(0)'>关闭</button>"+
	"</div>"

	if(!dlgSaveFiles){
		dlgSaveFiles = new dijit.Dialog({
			title: "批量下载附件",
			style: "width: 420px"
		});
	}
	dlgSaveFiles.set("content", strHTML);
	dlgSaveFiles.show();

}
/**
 * SaveMultiFiles()
 *『函数功能』
 * 	下载多个附件到本地，由fnShowSaveMultiFiles调用
 */
function SaveMultiFiles(){
	blnMultiSaveEvent=true; //有时候多附件下载太多，想去掉下载完成的提示，可解除此注释
	var arrCK=document.getElementsByName("chkidx_dl");
	var strFiles="";
	dojo.forEach(arrCK,function(ck){
		if(ck.checked){
			var strFileName=ck.parentNode.nextSibling.getAttribute("fname");
			strFiles+="|"+strFileName;
		}
	})
	fnShowSaveMultiFiles(0);
	if(strFiles!=""){
		slCtl.Content.Control.SaveMultiFiles(strFiles);
	}
}
/**
 * SaveFileCompleted()
 *『函数功能』
 * 	下载到本地结束后给出提示。
 *『函数参数』
 *	args	 下载成功后返回的附件名称
 * 
 */
function SaveFileCompleted(sender, args){
	if(!blnMultiSaveEvent){
		alert(args.FileName+" 下载完成！")
	}else{
		alert("下载完成！")
	}

}

/**
 * AddFile()
 *『函数功能』
 * 	添加附件
 *『函数参数』
 *	catnum	 附件分类，系统保留分类勿用。附件0;	正文-1;手写批示png-2	;痕迹-3;	原始稿-4;
 */
function AddFile(catnum){
	if(typeof fnCheckSession=='function'){
		if(!fnCheckSession()){
			return false;
		}
	}

	if(parseInt(catnum)==-1&&getZhengWen()!=""){
		alert("正文附件已存在，不可重复添加！")
		return false;
	}
	slCtl.Content.Control.AddFile(catnum);
}
/**
 * QingGaoFile()
 *『函数功能』
 * 	添加附件
 *『函数参数』
 *	fname 	 附件名称
 *	mode	 是否生成原始稿;
 */
function QingGaoFile(fname,mode){
	showDiv();
	slCtl.Content.Control.QingGao(fname,true);
}
/**
 * TaoDaFile()
 *『函数功能』
 * 	套打，弹出套打红头选择列表
 *『函数参数』
 *	fname 	 附件名称
 */
function TaoDaFile(fname){
	//frmwebflow 中的filename_taoda
	var filenames = document.forms[0].idx_filename_taoda.value

	if (filenames.indexOf(fname)!=-1)
	{
		alert("该公文已经被套打过了，不能被重复套打");
		return ;
	}

	if (confirm("请确认您是否已经做了清稿操作，如果没有，请您点击“取消”按钮返回，先清稿")){
		//记住要套打的名字，显示红头选择层
		var objTodofile=document.forms[0].fldTodoFileName;
		objTodofile.value=fname;
		//sfrmShowDlg中
		fnShowTaoDa()
	}

}
/**
 * RevertTaoDaFile()
 *『函数功能』
 * 	套打撤回，将fname(原始稿)替换当前套打错误的正文附件
 *『函数参数』
 *	fid 	 附件id
 */
function RevertTaoDaFile(fid){

	if (confirm("套打撤回，确认用此附件件替换正文？")){
		//转办
		var errhandle=dojo.subscribe("/attach/submiterror",function(){
			dojo.unsubscribe(errhandle);
			dojo.unsubscribe(handle);
			return false;
		});
		var handle=dojo.subscribe("/wfeditor/submitover",function(){
			dojo.unsubscribe(errhandle);
			dojo.unsubscribe(handle);
			document.forms[0].filename_reverttaoda.value=fid;
			document.forms[0].$$querysaveagent.value="agtRevertTaoDa";
			document.forms[0].submit();
		});
		UploadIndiDocFiles();


	}

}

/**
 * ExcuteTaoDa()
 *『函数功能』
 * 	套打，该函数由frmTaoDa中的OkClick回调，执行套打
 *『函数参数』
 *	ModelUrl 	 红头模板地址
 **	ContentFieldName 	 正文被插入的域名称，一般为正文部分
 **	FileName 	 被套打的附件名
 **	SaveOldDoc 	 是否保留原始稿	，缺省为true
 **	OldDocName 	 原始稿名称，saveolddoc参数为true时生效，为空时按照控件逻辑自己命名，为XXX_原始稿.doc
 **	values 	 套打中签发人、标题域值串，为 签发人=admin|起草人=张三格式
 *
 */
function ExcuteTaoDa(ModelUrl,ContentFieldName,FileName,SaveOldDoc,OldDocName,values){
	showDiv();

	try{
		var rt=slCtl.Content.Control.TaoDa(ModelUrl,ContentFieldName,FileName,SaveOldDoc,OldDocName,values);
		if(!rt)return false;
	}catch(e){
		return false
	}
	//写入frmwebflow 中的filename_taoda套打标记，控制套打次数，打开被套打文件为只读。
	if (document.forms[0].filename_taoda.value == "")
		document.forms[0].filename_taoda.value =FileName;
	else
		document.forms[0].filename_taoda.value += ";" +FileName;

	if (document.forms[0].idx_filename_taoda.value == "")
		document.forms[0].idx_filename_taoda.value =FileName;
	else
		document.forms[0].idx_filename_taoda.value += ";" +FileName;

	return true;
}
/**
 * ExcuteCreateFromTemplate()
 *『函数功能』
 * 	从红头模板创建
 *『函数参数』
 *	ModelUrl 	 红头模板地址
 **	FileName 	 创建后的名字
 *	values		 域值串，格式为 签发人=admin|起草人=张三 
 */
function ExcuteCreateFromTemplate(ModelUrl,FileName,values){

	slCtl.Content.Control.CreateFromTemplate(ModelUrl,FileName,values);
}
/**
 * GaiZhangFile()
 *『函数功能』
 * 	盖章，弹出印章列表。
 *『函数参数』
 **	fname 	 被盖章的附件名字
 */
function GaiZhangFile(fname){
	var objTodofile=document.forms[0].fldTodoFileName;
	objTodofile.value=fname;
	fnShowGaiZhang()
}
/**
 * ExcuteGaiZhang
 *『函数功能』
 * 	盖章，执行。
 *『函数参数』
 *	ModelUrl 	 印章模板地址
 **	ContentFieldName 	 正文被插入的域名称，一般为正文部分
 **	FileName 	 被盖章的附件名
 **	SaveOldDoc 	 是否保留原始稿	，缺省为false
 **	OldDocName 	 原始稿名称，saveolddoc参数为true时生效，为空时按照控件逻辑自己命名。
 **	values 	 盖章过程中签发人、标题域值串，为 签发人=admin|起草人=张三格式
 *
 */
function ExcuteGaiZhang(ModelUrl,ContentFieldName,FileName,SaveOldDoc,OldDocName,values){
	showDiv();
	try{
		slCtl.Content.Control.GaiZhang(ModelUrl,ContentFieldName,FileName,SaveOldDoc,OldDocName,values);
	}catch(e){
		return false
	}
	//写入本子表单 中的filename_gaizhang标记，以后打开被盖章文件为只读。
	if (document.forms[0].filename_gaizhang.value == "")
		document.forms[0].filename_gaizhang.value =FileName;
	else
		document.forms[0].filename_gaizhang.value += ";" +FileName;

	return true;
}
/**
 * getFileType
 *『函数功能』
 * 	获取strFileName的类型，返回如".doc"
 **/
function getFileType(strFileName){
	var arrtmp=strFileName.split(".");
	return "."+arrtmp.pop()
}
/**
 * getStrSize
 *『函数功能』
 * 	格式化附件的大小
 **/
function getStrSize(size){
	var size2
	if(size<1024){
		return  size+"B"
	}else{
		size2=Math.round(size/1024);
		if(size2<1024){
			return size2+"KB"
		}else{
			size2=Math.round(size/1024/1024);
			return size2+"MB"
		}
	}
}
/**
 * getZhengWen
 *『函数功能』
 * 	获取当前发文的正文附件，若有，返回其名称，若没有，返回空。
 **/
function getZhengWen(retUnid){
	var files=slCtl.Content.Files;
	var userFile;
	var zwFileName="";
	var zwFileUnid="";
	for (i = 0; i < files.FileList.length; i++) {	
		userFile = files.FileList[i];
		if (parseInt(userFile.CatNum)==-1){
			zwFileName=userFile.FileName;
			zwFileUnid=userFile.Unid;
		}

	}
	return (retUnid=="unid"?zwFileUnid:zwFileName);
}

/**
 * changeScanType
 *『函数功能』
 * 	切换扫描类型，新增or追加，为追加时列出可追加的附件名
 **/
function changeScanType(value){
	var oinput=document.getElementsByName("fldNewScan")[0];
	var oselect=document.getElementsByName("fldAppendScan")[0];
	if(value==0){
		//新增扫描
		oinput.style.display="inline";
		oselect.style.display="none";

	}else{
		//追加扫描
		oinput.style.display="none";
		oselect.style.display="inline";
		//查找控件中可以被追加的扫描件
		var files=slCtl.Content.Files;
		var userFile;
		var arrFiles=new Array();
		for (i = 0; i < files.FileList.length; i++) {	
			userFile = files.FileList[i];
			if (parseInt(userFile.CatNum)==-7){ //是扫描附件
				var strfilename=userFile.FileName;
				var strType=strfilename.substring(strfilename.lastIndexOf("."),strfilename.length).toLowerCase();
				var arrTypePermitted=[".tif",".tiff"];
				if(dojo.some(arrTypePermitted,function(strTypePermitted){return strType==strTypePermitted})){
					arrFiles.push(strfilename);
				}
			}
		}
		for (i = 0; i < arrFiles.length; i++) {	
			var oOptionTmp=new Option(arrFiles[i],arrFiles[i]);
			oselect.options.add(oOptionTmp)
		}


	}
}
/**
 * fnShowScan
 *『函数功能』
 * 	执行扫描
 **/
function ExcuteScan(){
	var strScanName;
	if(document.getElementsByName("rdoScanType")[0].checked){
		strScanName=document.getElementsByName("fldNewScan")[0].value;
		if(strScanName==""){
			alert("请输入扫描文件名");
			return false;
		}
		strType=strScanName.substring(strScanName.lastIndexOf("."),strScanName.length).toLowerCase();
		var arrTypePermitted=[".tif",".tiff",".pdf",".gif",".png",".jpg",".bmp"];
		if(!dojo.some(arrTypePermitted,function(strTypePermitted){return strType==strTypePermitted})){
			alert("扫描文件的扩展名不支持")
			return false
		}
		fnShowScan(0);
		showDiv();
		slCtl.Content.Control.NewScan(strScanName)
	}else{
		if(document.getElementsByName("fldAppendScan")[0].options.length==0){
			alert("不存在可追加的扫描件")
			return false
		}
		var index=document.getElementsByName("fldAppendScan")[0].selectedIndex;
		strScanName=document.getElementsByName("fldAppendScan")[0].options[index].value;
		fnShowScan(0);
		showDiv();
		slCtl.Content.Control.AppendScan(strScanName)
	}

}
/**
 * fnShowScan
 *『函数功能』
 * 	弹出扫描dialog层
 **/
function fnShowScan(){

	//fnShowScans(0) 层hide
	if(arguments.length>0){
		if(!!dlgWebScan){
			dlgWebScan.hide();
		}
		return true;
	}

	var	strHTML="<div style='height:20px;padding-bottom:10px;'>";
	strHTML+="<label style='padding-right:10px;'><input type='radio' checked='' value='0' name='rdoScanType' onclick='changeScanType(0)'>新增</label>";
	strHTML+="<label><input type='radio'  value='1' name='rdoScanType' onclick='changeScanType(1)'>追加</label>";
	strHTML+="</div>";
	strHTML+="<div>";
	strHTML+="<p style='color:red;padding-bottom:10px;' name='fldNewScanTip'>(支持pdf,tif,gif,jpg,bmp,png，只有tif文件可追加扫描)</p>";
	strHTML+="<input style='width:250px' name='fldNewScan' value='扫描正文.pdf'>";
	strHTML+="<select size='1' style='width:250px;vertical-align:bottom;display:none' name='fldAppendScan'>";
	strHTML+="</select>"
		strHTML+="<span class='btn-action-key'><button type='button' onClick='ExcuteScan()' dojoType='smartdot.form.Button'>确定</button></span>"
			strHTML+="<button type='button' onClick='fnShowScan(0)' dojoType='smartdot.form.Button'>取消</button>"
				strHTML+="</div>";

	if(!dlgWebScan){
		dlgWebScan = new dijit.Dialog({
			title: "上传扫描件",
			style: "width: 400px"
		});
	}
	dlgWebScan.set("content", strHTML);
	dlgWebScan.show();

}

/**
 * fnShowTaoDa
 *『函数功能』
 * 	弹出套打dialog层
 **/
function fnShowTaoDa(){
	if(!dlgTaoDa){
		var unid = document.forms[0].DocumentID.value;//获取主文档的ID号用来过滤红头 2012-03-01 丁超
		var strAppPath = document.getElementsByName("appPath_forJS")[0].value;
		var strUrl = "/"+strAppPath + "/businessrules.nsf/frmRedHeadSelecter?openform&unid=" + unid;
		dlgTaoDa=new smartdot.IframeDialog({title:"套打", src:strUrl});
	}
	if( arguments.length==1 ){
		dlgTaoDa.hide();
	}else{
		dlgTaoDa.show();
	}
} 
/**
 * fnShowCreateFromTemplate
 *『函数功能』
 * 	弹出红头创建dialog层
 **/
function fnShowCreateFromTemplate(){
	if(!dlgCreateFromTemplate){
		var strUrl = location.href.toLowerCase();
		strUrl = strUrl.substr(0,strUrl.indexOf(".nsf")+4);
		strUrl = strUrl + "/frmTemplateSelecter?openform";
		dlgCreateFromTemplate=new smartdot.IframeDialog({title:"用模板创建正文", src:strUrl});
	}
	if( arguments.length==1 ){
		dlgCreateFromTemplate.hide();	
	}else{
		if(getZhengWen()!=""){ 
			alert("正文附件已存在，不可重复添加！")
			return false;
		}
		dlgCreateFromTemplate.show();
	}
}
/**
 * fnShowGaiZhang
 *『函数功能』
 * 	弹出盖章创建dialog层
 * 	2013-06-25 xull	盖章逻辑移到业务规则库中
 **/
function fnShowGaiZhang(){
	if(!dlgGaiZhang){
		var unid = document.forms[0].DocumentID.value;//获取主文档的ID号用来过滤印章 2012-03-01 丁超
		var strAppPath = document.getElementsByName("appPath_forJS")[0].value;
		//zhaolk--2013-10-24--增加本库路径的传递--
		var strUrl = "/"+strAppPath + "/businessrules.nsf/frmMarkSelecter?openform&unid=" 
		+ unid+"&fwpath="+document.getElementsByName("dbPath_forJS")[0].value
		dlgGaiZhang=new smartdot.IframeDialog({title:"盖章", src:strUrl});
	}
	if( arguments.length==1 ){
		dlgGaiZhang.hide();	
	}else{
		dlgGaiZhang.show();
	}
}
/**
 * fnShowSx
 *『函数功能』
 * 	弹出手写批示dialog层
 **/
function fnShowSx(){
	var objDialog = dijit.byId("dlgWebPaint");
	if( arguments.length==1 ){
		objDialog.hide();	
	}else{

		var ifr = document.getElementById("ifrWebPaint");
		var strSrc = ifr.getAttribute("src") ;
		var mid=document.forms[0].idx_MainDocUNID.value
		var seq=document.forms[0].idx_Sequence.value
		if( strSrc == "" ){
			var strUrl = location.href.toLowerCase();
			strUrl = strUrl.substr(0,strUrl.indexOf(".nsf")+4);
			strUrl = strUrl + "/frmWebPaint?openform&maindocunid="+mid+"&seq="+seq
			ifr.src = strUrl;
			ifr.width="705px"
				ifr.height="405px"
		}
		dojo.query(objDialog.containerNode).addClass('webpaint');
		objDialog.attr("autofocus",false);
		objDialog.show();	

	}
	/* 太慢
		if(!dlgWebPaint){
			var mid=document.forms[0].idx_MainDocUNID.value
			var seq=document.forms[0].idx_Sequence.value
			var strUrl = location.href.toLowerCase();
			strUrl = strUrl.substr(0,strUrl.indexOf(".nsf")+4);
			strUrl = strUrl + "/frmWebPaint?openform&maindocunid="+mid+"&seq="+seq
			dlgWebPaint=new smartdot.IframeDialog({title:"手写批

示",src:strUrl,width:"775px",height:"400px",scrolling:"no"});
		}
		if( arguments.length==1 ){
			dlgWebPaint.hide();	
		}else{
			dlgWebPaint.show();
		}
	 */
}
/**
 * uploadWebPaint
 *『函数功能』
 * 	新手写批示提交
 * qucheng 2012-03-27修改，如果没有手写批示，表单上的手写批示图片文件名清空
 **/
function uploadWebPaint(){
	//新手写批示提交
	try{
		var ifr = window.frames["ifrWebPaint"];
		if(ifr&& ifr.document.forms[0]&&ifr.document.forms[0].mypaint){
			var mypaint=ifr.document.forms[0].mypaint;
			if(mypaint.Content.Control.IsSigned()){
				//因为UploadIndiDocFiles先提交意见，再提交附件。当提交附件时，有可能附件是打开的，会提示用户关闭后再次提交。
				//因此用blnHAFileUploaded，记录是否已经提交过意见，避免重复提交。
				if(!blnHAFileUploaded){
					showWaitMsg("正在提交意见,请稍候...");
					mypaint.Content.Control.UploadCompleted=mypaintSubmitOver;
					mypaint.Content.Control.ErrorOccurred=attachSubmitError;
					mypaint.Content.Control.StartUpload();
				}else{
					mypaintSubmitOver('noHAFile');
				}

			}else{
				mypaintSubmitOver('noHAFile');
				/*
				if (document.getElementById("idx_CurHAFile")){
					document.getElementById("idx_CurHAFile").value = "";
				}*/
			}	
		}else{
			mypaintSubmitOver('noHAFile');
			/*
			if (document.getElementById("idx_CurHAFile")){
				document.getElementById("idx_CurHAFile").value = "";
			}*/
		}

	}catch(e){
		/*
		if (document.getElementById("idx_CurHAFile")){
			document.getElementById("idx_CurHAFile").value = "";
		}*/			
		return false;
	}
	return true;

}
/**
 * UploadIndiDocFiles
 *『函数功能』
 * 	先上传手写意见再更新附件到服务器
 **/
function UploadIndiDocFiles(){
	//2012-9-18 by sunxz 移动设备,or没装控件，直接进行下一步。
	if(!isIdxPluginInstalled()){
		dojo.publish("/wfeditor/submitover");
		return ;
	}
	//先注册意见提交结束事件，等uploadWebPaint->mypaintSubmitOver发布此事件后,再执行function中的提交附件过程
	var handle = dojo.subscribe("/mypaint/submitover",function(){
		dojo.unsubscribe(handle);
		if(slCtl&&slCtl.Content&&slCtl.Content.Control){
			showWaitMsg("正在提交附件,请稍候...");
			slCtl.Content.Files.AllFilePost=wfeditorSubmitOver;
			slCtl.Content.Files.ErrorOccurred=attachSubmitError;
			slCtl.Content.Control.UpdateAllFiles();
		}else{
			wfeditorSubmitOver();
		}	 

	});

	uploadWebPaint();

}

function mypaintSubmitOver(){
	hideWaitMsg();
	//2012-6-30 by sunxz chrome下提交成后直接引用arguments[0]会出错。
	if(arguments.length==1){
		var argtmp=arguments[0];
		if(argtmp&&argtmp!='noHAFile'){
			blnHAFileUploaded=true
		}
	}
	//意见提交结束，发布事件
	dojo.publish("/mypaint/submitover");

}
function wfeditorSubmitOver(){

	//2012-7-13 by sunxz 附件解锁不再完全依赖页面销毁事件。点击提交后，附件解锁，第二个参数为false，表示解锁过程为同步方式。
	fnUnlockFile("ALLMYLOCKFILE",false)
	//2012-9-17 by sunxz 记录所有附件及顺序。
	SaveFileIndex(true)

	hideWaitMsg();
	//由附件提交结束，发布事件，此事件一般在sfrmFlowButtonV5声明
	dojo.publish("/wfeditor/submitover");

}
function attachSubmitError(){
	//意见or附件提交失败
	dojo.publish("/attach/submiterror");
	hideWaitMsg();
}

function setEdit(unid){
	//设置可以编辑
	var fldCanEditDocUnid = document.getElementById("fldCanEditDocUnid");
	if(fldCanEditDocUnid){
		if(fldCanEditDocUnid.value == ""){
			fldCanEditDocUnid.value = unid
		}else{
			if(fldCanEditDocUnid.value.indexOf(unid) == -1){
				fldCanEditDocUnid.value = fldCanEditDocUnid.value + "~" + unid;
			}
		}
	}
	alert("设置文件编辑成功！");
}

function setnoEdit(unid){
	//设置不可编辑
	var fldCanEditDocUnid = document.getElementById("fldCanEditDocUnid");
	var tmpStr = fldCanEditDocUnid.value;
	if(fldCanEditDocUnid){
		if(fldCanEditDocUnid.value.indexOf(unid) != -1){
			if(fldCanEditDocUnid.value.indexOf(unid+"~") != -1){
				fldCanEditDocUnid.value = fldCanEditDocUnid.value.replace(unid+"~","");
			}else{
				if(fldCanEditDocUnid.value.indexOf("~"+unid) != -1){
					fldCanEditDocUnid.value = fldCanEditDocUnid.value.replace("~"+unid,"");
				}else{
					fldCanEditDocUnid.value = tmpStr.replace(unid,"");				
				}		
			}
		}
	}
	alert("设置取消文件编辑成功！");
}
