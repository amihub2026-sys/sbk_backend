import mongoose from "mongoose";
import {
  Category,
  Competition,
  EventSettings,
  Judge,
  Registration,
  Slot,
  User,
} from "../models/index.js";
import bcrypt from "bcryptjs";
import { storeDataUrlImage } from "../services/media.service.js";
import { audit } from "../services/audit.service.js";
import { getAdminState } from "../services/state.service.js";
import { HttpError } from "../utils/http.js";
const validId = (v) => mongoose.isValidObjectId(v);
export async function state(req, res) {
  res.json(await getAdminState());
}
export async function saveSettings(req, res) {
  const body = { ...req.body };
  for (const k of ["id", "_id", "singleton", "createdAt", "updatedAt"])
    delete body[k];
  if (body.bannerImage)
    body.bannerImage = await storeDataUrlImage(body.bannerImage, "banner");
  if (body.prefix)
    body.prefix = String(body.prefix)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  const s = await EventSettings.findOneAndUpdate(
    { singleton: "main" },
    { $set: body },
    { new: true, upsert: true, runValidators: true },
  );
  await audit(req, "settings.update", "EventSettings", s._id, {});
  res.json({ ok: true });
}
export async function saveCategory(req, res) {
  const name =
    String(req.body.name || "").trim();

  const nameTa =
    String(req.body.nameTa || "").trim();

  const minMonths =
    Number(req.body.minMonths);

  const maxMonths =
    Number(req.body.maxMonths);

  const active =
    req.body.active !== false;


  if (
    !name ||
    !nameTa ||
    !Number.isFinite(minMonths) ||
    !Number.isFinite(maxMonths) ||
    minMonths < 0 ||
    maxMonths <= minMonths
  ) {
    throw new HttpError(
      422,
      "Enter a valid category name and age range.",
    );
  }


  /*
   * =========================================
   * UPDATE EXISTING CATEGORY
   * =========================================
   */

  if (validId(req.params.id)) {
    const old =
      await Category.findById(
        req.params.id,
      );

    if (!old) {
      throw new HttpError(
        404,
        "Category not found.",
      );
    }


    /*
     * Prevent overlapping active age ranges.
     *
     * Example:
     * Category V = 108 to <120
     * Another active category cannot also use
     * 110 to <125.
     */

    if (active) {
      const overlap =
        await Category.findOne({
          _id: {
            $ne: old._id,
          },

          active: true,

          minMonths: {
            $lt: maxMonths,
          },

          maxMonths: {
            $gt: minMonths,
          },
        });

      if (overlap) {
        throw new HttpError(
          409,
          `Age range overlaps with ${overlap.name}.`,
        );
      }
    }


    old.name = name;
    old.nameTa = nameTa;
    old.minMonths = minMonths;
    old.maxMonths = maxMonths;
    old.active = active;

    await old.save();


    await audit(
      req,
      "category.update",
      "Category",
      old._id,
      {
        minMonths,
        maxMonths,
      },
    );


    return res.json({
      ok: true,
      id: String(old._id),
    });
  }


  /*
   * =========================================
   * CREATE NEW CATEGORY
   * =========================================
   */

  if (active) {
    const overlap =
      await Category.findOne({
        active: true,

        minMonths: {
          $lt: maxMonths,
        },

        maxMonths: {
          $gt: minMonths,
        },
      });

    if (overlap) {
      throw new HttpError(
        409,
        `Age range overlaps with ${overlap.name}.`,
      );
    }
  }


  /*
   * Automatically place new category
   * after the existing categories.
   */

  const last =
    await Category.findOne()
      .sort({
        order: -1,
      })
      .select("order")
      .lean();


  const nextOrder =
    Number(last?.order || 0) + 1;


  /*
   * Category model requires unique key.
   */

  const key =
    `custom-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;


  const category =
    await Category.create({
      key,
      name,
      nameTa,
      minMonths,
      maxMonths,
      active,
      order: nextOrder,
    });


  await audit(
    req,
    "category.create",
    "Category",
    category._id,
    {
      minMonths,
      maxMonths,
    },
  );


  res.json({
    ok: true,
    id: String(category._id),
  });
}
export async function deleteCategory(
  req,
  res,
) {
  if (!validId(req.params.id)) {
    throw new HttpError(
      422,
      "Invalid category id.",
    );
  }


  const category =
    await Category.findById(
      req.params.id,
    );


  if (!category) {
    throw new HttpError(
      404,
      "Category not found.",
    );
  }


  /*
   * =========================================
   * SAFETY CHECK 1
   * Competition uses this category
   * =========================================
   */

  const competitionUsingCategory =
    await Competition.exists({
      categoryIds: req.params.id,
    });


  if (competitionUsingCategory) {
    throw new HttpError(
      409,
      "This age category is assigned to one or more competitions and cannot be deleted.",
    );
  }


  /*
   * =========================================
   * SAFETY CHECK 2
   * Participant registration uses category
   * =========================================
   */

  const registrationUsingCategory =
    await Registration.exists({
      categoryId: req.params.id,
      cancelled: false,
    });


  if (registrationUsingCategory) {
    throw new HttpError(
      409,
      "This age category has participant registrations and cannot be deleted.",
    );
  }


  await Category.deleteOne({
    _id: category._id,
  });


  await audit(
    req,
    "category.delete",
    "Category",
    category._id,
    {},
  );


  res.json({
    ok: true,
  });
}
export async function saveSlot(req, res) {
  const data = req.body;
  if (data.start >= data.end)
    throw new HttpError(422, "Slot end time must be after start time.");
  let s;
  if (validId(req.params.id)) {
    s = await Slot.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!s) throw new HttpError(404, "Slot not found.");
  } else {
    s = await Slot.create(data);
  }
  await audit(req, "slot.save", "Slot", s._id, {});
  res.json({ ok: true, id: String(s._id) });
}
export async function deleteSlot(req, res) {
  if (!validId(req.params.id)) throw new HttpError(422, "Invalid slot id.");
  if (await Competition.exists({ slotId: req.params.id }))
    throw new HttpError(409, "This slot is assigned to a competition.");
  const s = await Slot.findByIdAndDelete(req.params.id);
  if (!s) throw new HttpError(404, "Slot not found.");
  await audit(req, "slot.delete", "Slot", s._id, {});
  res.json({ ok: true });
}
export async function saveCompetition(req, res) {
  const categoryIds = req.body.categoryIds.filter(validId);
  if (categoryIds.length !== req.body.categoryIds.length)
    throw new HttpError(422, "One or more age categories are invalid.");
  const image = req.body.image
    ? await storeDataUrlImage(req.body.image, "competition")
    : "";
  const data = {
    ...req.body,
    categoryIds,
    slotId: validId(req.body.slotId) ? req.body.slotId : null,
    image,
  };
  let c;
  if (validId(req.params.id)) {
    const old = await Competition.findById(req.params.id);
    if (!old) throw new HttpError(404, "Competition not found.");
    if (!image) data.image = old.image;
    c = await Competition.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true },
    );
  } else {
    c = await Competition.create({ ...data, key: `custom-${Date.now()}` });
  }
  await audit(req, "competition.save", "Competition", c._id, {});
  res.json({ ok: true, id: String(c._id) });
}
export async function deleteCompetition(req, res) {
  if (!validId(req.params.id))
    throw new HttpError(422, "Invalid competition id.");
  if (
    await Registration.exists({
      competitionIds: req.params.id,
      cancelled: false,
    })
  )
    throw new HttpError(
      409,
      "Competition has registrations and cannot be deleted.",
    );
  const c = await Competition.findByIdAndDelete(req.params.id);
  if (!c) throw new HttpError(404, "Competition not found.");
  await audit(req, "competition.delete", "Competition", c._id, {});
  res.json({ ok: true });
}
export async function saveJudge(req, res) {
  const { name, email, phone, competitionIds, active, temporaryPassword } =
    req.body;
  if (competitionIds.some((id) => !validId(id)))
    throw new HttpError(422, "One or more assigned competitions are invalid.");
  let judge;
  if (validId(req.params.id)) {
    judge = await Judge.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          email,
          phone: String(phone).replace(/\D/g, ""),
          competitionIds,
          active,
        },
      },
      { new: true, runValidators: true },
    );
    if (!judge) throw new HttpError(404, "Judge not found.");
    const user = await User.findOne({ judgeId: judge._id });
    if (user) {
      user.name = name;
      user.email = email;
      user.active = active;
      if (temporaryPassword) {
        if (temporaryPassword.length < 8)
          throw new HttpError(
            422,
            "Temporary password must contain at least 8 characters.",
          );
        user.passwordHash = await bcrypt.hash(temporaryPassword, 12);
        user.passwordChangedAt = new Date();
      }
      await user.save();
    }
  } else {
    if (!temporaryPassword || temporaryPassword.length < 8)
      throw new HttpError(
        422,
        "A temporary password of at least 8 characters is required for a new judge.",
      );
    judge = await Judge.create({
      name,
      email,
      phone: String(phone).replace(/\D/g, ""),
      competitionIds,
      active,
    });
    try {
      await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        role: "judge",
        judgeId: judge._id,
        active,
      });
    } catch (err) {
      await Judge.findByIdAndDelete(judge._id);
      throw err;
    }
  }
  await audit(req, "judge.save", "Judge", judge._id, { competitionIds });
  res.json({ ok: true, id: String(judge._id) });
}
export async function deleteJudge(req, res) {
  if (!validId(req.params.id)) throw new HttpError(422, "Invalid judge id.");
  const j = await Judge.findById(req.params.id);
  if (!j) throw new HttpError(404, "Judge not found.");
  await User.deleteMany({ judgeId: j._id });
  await Judge.deleteOne({ _id: j._id });
  await audit(req, "judge.delete", "Judge", j._id, {});
  res.json({ ok: true });
}
