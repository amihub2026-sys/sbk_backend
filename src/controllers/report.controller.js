import { getDashboardReport } from "../services/report.service.js";
export async function dashboard(req,res){res.json(await getDashboardReport());}
